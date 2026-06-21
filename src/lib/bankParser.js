// Bank-statement parsing for CSV / Excel / PDF — all client-side, nothing leaves the device.
// Goal: be generic across banks rather than hardcode one format.
//
// Output of parseFile(file):
//   { transactions: [{ id, date, description, amount, direction }], meta: { source } }
//   - amount is always a positive magnitude
//   - direction is "out" (money spent) or "in" (money received)

import Papa from "papaparse";
import * as XLSX from "xlsx";

// pdf.js is heavy (~1.2MB); it's imported lazily inside fromPDF so it only
// loads when the user actually uploads a PDF.

// --- Header dictionaries (lowercased, diacritics stripped) ----------------
const DATE_HEADERS = ["data", "date", "data tranzactiei", "data operatiunii", "transaction date", "booking date", "posting date", "started date", "completed date", "data valutei", "value date", "data inregistrarii"];
const DESC_HEADERS = ["descriere", "detalii", "description", "details", "beneficiar", "explicatii", "narrative", "reference", "referinta", "merchant", "payee", "denumire", "tip tranzactie", "comerciant", "terminal"];
const AMOUNT_HEADERS = ["suma", "amount", "valoare", "value", "suma tranzactiei"];
const DEBIT_HEADERS = ["debit", "suma debit", "plati", "plata", "cheltuieli", "withdrawal", "paid out", "iesiri", "debit amount"];
const CREDIT_HEADERS = ["credit", "suma credit", "incasari", "deposit", "paid in", "intrari", "credit amount"];

// Abbreviated/full month names, English + Romanian (e.g. "Apr 1, 2026", "1 apr 2026").
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ian|iun|iul|noi|mai)[a-z]*";
const DATE_RE = new RegExp(
  "(\\d{1,2}[.\\/-]\\d{1,2}[.\\/-]\\d{2,4}" + // 01.04.2026
  "|\\d{4}[.\\/-]\\d{1,2}[.\\/-]\\d{1,2}" +   // 2026-04-01
  "|" + MONTH + "\\.?\\s+\\d{1,2},?\\s+\\d{2,4}" + // Apr 1, 2026
  "|\\d{1,2}\\s+" + MONTH + "\\.?\\s+\\d{2,4})", // 1 Apr 2026
  "i"
);
// Amount with 2 decimals; thousands grouped by . or , only (1.234,56 / 1,234.56 / 8,060.68).
// Space is deliberately NOT a thousands separator here — it would merge a merchant name
// ending in digits with the following amount (e.g. "Trading 212 205.45" → "212205.45").
const AMOUNT_RE = /-?\d+(?:[.,]\d{3})*[.,]\d{2}(?!\d)/g;
const INCOME_RE = /salar|salary|dobanda|dividend|refund|reward|cashback|rambursare|pensie|incasare|transfer from|from .*saving|top.?up|added money|received/i;
// Internal transfers: moving money between the user's OWN accounts (savings/vault/deposit).
// These aren't real spending/income, so the UI can optionally exclude them.
const INTERNAL_RE = /\bsavings\b|\bvault\b|\bdeposit\b|\bpocket\b|exchanged to|economii/i;
export const isInternalTransfer = (desc) => INTERNAL_RE.test(desc || "");

// --- Number parsing (handles RO "1.234,56" and EN "1,234.56") --------------
export function parseNumber(raw) {
  if (raw == null) return NaN;
  if (typeof raw === "number") return raw;
  let s = String(raw).trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.includes("-")) neg = true;
  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";
    s = s.split(thouSep).join("").replace(decSep, ".");
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    s = after === 1 || after === 2 ? s.replace(",", ".") : s.split(",").join("");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return neg ? -Math.abs(n) : n;
}

function matchDate(s) {
  const m = s && String(s).match(DATE_RE);
  return m ? m[0] : null;
}

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
const isIncome = (desc) => INCOME_RE.test(desc || "");

// --- Entry point -----------------------------------------------------------
export async function parseFile(file) {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".pdf") || type === "application/pdf") {
    const buf = await file.arrayBuffer();
    return { transactions: await fromPDF(buf), meta: { source: "pdf" } };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("sheet") || type.includes("excel")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
    return { transactions: fromRows(rows), meta: { source: "excel" } };
  }
  // default: CSV (Papa auto-detects the delimiter, incl. ";")
  const text = await file.text();
  const rows = Papa.parse(text, { skipEmptyLines: true }).data;
  return { transactions: fromRows(rows), meta: { source: "csv" } };
}

// --- Tabular (CSV/Excel) ---------------------------------------------------
function scoreHeaderRow(row) {
  const cells = row.map(norm);
  const has = (arr) => cells.some((c) => arr.some((h) => c === h || c.includes(h)));
  let score = 0;
  if (has(DATE_HEADERS)) score++;
  if (has(DESC_HEADERS)) score++;
  if (has(AMOUNT_HEADERS) || has(DEBIT_HEADERS) || has(CREDIT_HEADERS)) score++;
  return score;
}

function pickColumn(cells, candidates, used) {
  for (let i = 0; i < cells.length; i++) if (!used.has(i) && candidates.includes(cells[i])) return i;
  for (let i = 0; i < cells.length; i++) if (!used.has(i) && candidates.some((h) => cells[i].includes(h))) return i;
  return -1;
}

function detectByContent(rows) {
  const sample = rows.slice(0, Math.min(rows.length, 20));
  const colCount = Math.max(0, ...sample.map((r) => r.length));
  let dateIdx = -1, amountIdx = -1, descIdx = -1, dateScore = 0, amtScore = 0, textLen = -1;
  for (let c = 0; c < colCount; c++) {
    let dates = 0, nums = 0, chars = 0, n = 0;
    for (const r of sample) {
      const v = r[c];
      if (v == null || String(v).trim() === "") continue;
      n++;
      if (matchDate(v)) dates++;
      if (!isNaN(parseNumber(v))) nums++;
      chars += String(v).length;
    }
    if (n === 0) continue;
    if (dates / n > 0.6 && dates >= dateScore) { dateScore = dates; dateIdx = c; }
    if (nums / n > 0.6 && nums >= amtScore && c !== dateIdx) { amtScore = nums; amountIdx = c; }
    if (chars > textLen) { textLen = chars; descIdx = c; }
  }
  return { dateIdx, descIdx, amountIdx, debitIdx: -1, creditIdx: -1 };
}

function fromRows(input) {
  const rows = (input || []).filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""));
  if (rows.length === 0) return [];

  let headerIdx = -1, best = 0;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const s = scoreHeaderRow(rows[i]);
    if (s > best) { best = s; headerIdx = i; }
  }

  let map, dataRows;
  if (best >= 2) {
    const cells = rows[headerIdx].map(norm);
    const used = new Set();
    const dateIdx = pickColumn(cells, DATE_HEADERS, used); if (dateIdx >= 0) used.add(dateIdx);
    const descIdx = pickColumn(cells, DESC_HEADERS, used); if (descIdx >= 0) used.add(descIdx);
    const amountIdx = pickColumn(cells, AMOUNT_HEADERS, used); if (amountIdx >= 0) used.add(amountIdx);
    const debitIdx = pickColumn(cells, DEBIT_HEADERS, used); if (debitIdx >= 0) used.add(debitIdx);
    const creditIdx = pickColumn(cells, CREDIT_HEADERS, used); if (creditIdx >= 0) used.add(creditIdx);
    map = { dateIdx, descIdx, amountIdx, debitIdx, creditIdx };
    dataRows = rows.slice(headerIdx + 1);
  } else {
    map = detectByContent(rows);
    dataRows = rows;
  }
  return buildTxns(dataRows, map);
}

function buildTxns(dataRows, map) {
  const { dateIdx, descIdx, amountIdx, debitIdx, creditIdx } = map;
  const raw = [];
  for (const r of dataRows) {
    if (!Array.isArray(r)) continue;
    const dateRaw = dateIdx >= 0 ? String(r[dateIdx] ?? "").trim() : "";
    let description = descIdx >= 0 ? String(r[descIdx] ?? "").trim() : "";
    if (!description) {
      description = r
        .map((c) => String(c ?? ""))
        .filter((c, idx) => idx !== dateIdx && idx !== amountIdx && idx !== debitIdx && idx !== creditIdx && c.trim() && isNaN(parseNumber(c)))
        .join(" ")
        .trim();
    }
    let signed = null;
    if (debitIdx >= 0 || creditIdx >= 0) {
      const debit = debitIdx >= 0 ? parseNumber(r[debitIdx]) : NaN;
      const credit = creditIdx >= 0 ? parseNumber(r[creditIdx]) : NaN;
      if (!isNaN(debit) && Math.abs(debit) > 0) signed = -Math.abs(debit);
      else if (!isNaN(credit) && Math.abs(credit) > 0) signed = Math.abs(credit);
      else continue;
    } else if (amountIdx >= 0) {
      const n = parseNumber(r[amountIdx]);
      if (isNaN(n) || n === 0) continue;
      signed = n;
    } else continue;
    if (!dateRaw && !description) continue;
    raw.push({ dateRaw, description, signed });
  }

  // If the file used a single signed amount column but has no negatives at all,
  // the sign can't be trusted — fall back to income keywords for direction.
  const usedAmountCol = amountIdx >= 0 && debitIdx < 0 && creditIdx < 0;
  const anyNeg = raw.some((x) => x.signed < 0);
  return raw.map((x, i) => ({
    id: `tx_${i}_${Math.random().toString(36).slice(2, 8)}`,
    date: x.dateRaw,
    description: x.description || "(no description)",
    amount: Math.abs(x.signed),
    direction: usedAmountCol && !anyNeg ? (isIncome(x.description) ? "in" : "out") : x.signed < 0 ? "out" : "in",
    internal: isInternalTransfer(x.description),
  }));
}

// --- PDF (best-effort, line-based heuristic) -------------------------------
async function fromPDF(buf) {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const byRow = {};
    for (const it of content.items) {
      const y = Math.round(it.transform[5]);
      (byRow[y] = byRow[y] || []).push(it);
    }
    Object.keys(byRow)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach((y) => {
        const text = byRow[y]
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map((i) => i.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) lines.push(text);
      });
  }
  return linesToTxns(lines);
}

export function linesToTxns(lines) {
  const txns = [];
  let i = 0;
  let prevBalance = null;
  for (const line of lines) {
    const dm = line.match(DATE_RE);
    if (!dm) continue;
    const amounts = line.match(AMOUNT_RE);
    if (!amounts || amounts.length === 0) continue;
    // With multiple numbers the last is usually the running balance → the amount is the prior one.
    const amtStr = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
    const n = parseNumber(amtStr);
    if (isNaN(n) || n === 0) continue;
    const balance = amounts.length >= 2 ? parseNumber(amounts[amounts.length - 1]) : null;

    let desc = line.replace(dm[0], "");
    for (const a of amounts) desc = desc.replace(a, "");
    desc = desc.replace(/\b(RON|EUR|USD|GBP|LEI)\b/gi, "").replace(/[€£$]/g, "")
      .replace(/\s+/g, " ").replace(/^[-–|·\s]+/, "").trim();

    // Direction: prefer reconciling against the running balance, then fall back to keywords.
    let direction;
    const explicitOut = /-/.test(amtStr) || /\bdebit\b|plat[ăa]/i.test(line);
    if (explicitOut) {
      direction = "out";
    } else if (balance != null && prevBalance != null) {
      const out = Math.abs(prevBalance - n - balance) < 0.02;
      const inc = Math.abs(prevBalance + n - balance) < 0.02;
      direction = out && !inc ? "out" : inc && !out ? "in" : isIncome(line) ? "in" : "out";
    } else {
      direction = isIncome(line) ? "in" : "out";
    }
    if (balance != null) prevBalance = balance;

    txns.push({
      id: `pdf_${i++}_${Math.random().toString(36).slice(2, 8)}`,
      date: dm[0],
      description: desc || "(no description)",
      amount: Math.abs(n),
      direction,
      internal: isInternalTransfer(desc),
    });
  }
  return txns;
}

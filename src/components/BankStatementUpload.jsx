import React, { useState, useEffect, useMemo } from "react";
import { Upload, FileText, Trash2, Check, AlertTriangle, Lock } from "lucide-react";
import { parseFile } from "../lib/bankParser";
import { categorize, merchantKey, CATEGORIES } from "../lib/categorize";
import { storage } from "../lib/storage";

const RULES_KEY = "budget:catRules";
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];

const fmt = (n) => `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;

export default function BankStatementUpload({ onImport }) {
  const [status, setStatus] = useState("idle"); // idle | parsing | done | error
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState("");
  const [txns, setTxns] = useState([]);
  const [learned, setLearned] = useState({});
  const [dragging, setDragging] = useState(false);
  const [imported, setImported] = useState(false);
  const [excludeInternal, setExcludeInternal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(RULES_KEY);
        if (r) setLearned(JSON.parse(r.value));
      } catch { /* none */ }
    })();
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus("parsing");
    setError("");
    setFileName(file.name);
    setImported(false);
    try {
      const { transactions, meta } = await parseFile(file);
      const withCat = transactions.map((t) => ({
        ...t,
        category: t.direction === "out" ? categorize(t.description, learned) : "Income",
      }));
      if (withCat.length === 0) {
        setError("No transactions found in the file. Check the format — a CSV/Excel export from your bank's app is the most reliable.");
        setStatus("error");
        setTxns([]);
        return;
      }
      setSource(meta.source);
      setTxns(withCat);
      setStatus("done");
    } catch (e) {
      setError(e?.message || "Couldn't read the file.");
      setStatus("error");
      setTxns([]);
    }
  };

  const setCategory = (id, category) => {
    const t = txns.find((x) => x.id === id);
    const key = t ? merchantKey(t.description) : null;
    setTxns((prev) => prev.map((x) =>
      x.id === id || (key && x.direction === "out" && merchantKey(x.description) === key)
        ? { ...x, category }
        : x
    ));
    if (key) {
      const next = { ...learned, [key]: category };
      setLearned(next);
      storage.set(RULES_KEY, JSON.stringify(next)).catch(() => {});
    }
  };

  const internalCount = useMemo(() => txns.filter((t) => t.internal).length, [txns]);
  const visible = useMemo(() => (excludeInternal ? txns.filter((t) => !t.internal) : txns), [txns, excludeInternal]);
  const out = useMemo(() => visible.filter((t) => t.direction === "out"), [visible]);
  const inc = useMemo(() => visible.filter((t) => t.direction === "in"), [visible]);
  const totalOut = out.reduce((s, t) => s + t.amount, 0);
  const totalIn = inc.reduce((s, t) => s + t.amount, 0);

  const byCat = useMemo(() => {
    const m = {};
    for (const t of out) m[t.category] = (m[t.category] || 0) + t.amount;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [out]);

  const reset = () => {
    setTxns([]);
    setStatus("idle");
    setError("");
    setFileName("");
    setImported(false);
  };

  const doImport = () => {
    onImport(out.map((t) => ({ id: t.id, description: t.description, amount: t.amount, category: t.category })));
    setImported(true);
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-600" /> Upload Bank Statement
        </h2>
        {status === "done" && (
          <button onClick={reset} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
        <Lock className="w-3 h-3" /> Your file is read locally in your browser — nothing leaves your device.
      </p>

      {status !== "done" && (
        <>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"}`}
          >
            <FileText className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              {status === "parsing" ? "Analyzing…" : "Drag a file here or click to choose"}
            </p>
            <p className="text-xs text-slate-400">CSV, Excel (.xlsx/.xls) or PDF</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {status === "error" && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </>
      )}

      {status === "done" && (
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <FileText className="w-3.5 h-3.5" /> {fileName}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 uppercase font-semibold">{source}</span>
          </div>

          {source === "pdf" && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                The PDF was read heuristically (layouts vary from bank to bank). Check the amounts and categories before importing. For best accuracy, use a CSV/Excel export.
              </p>
            </div>
          )}

          {internalCount > 0 && (
            <label className="flex items-center gap-2 mb-4 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeInternal}
                onChange={(e) => setExcludeInternal(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Exclude internal transfers
              <span className="text-slate-400">({internalCount} detected — savings/vault moves between your own accounts)</span>
            </label>
          )}

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Spent</p>
              <p className="text-lg font-bold text-slate-900">{fmt(totalOut)}</p>
              <p className="text-[10px] text-slate-400">{out.length} transactions</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Received</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(totalIn)}</p>
              <p className="text-[10px] text-slate-400">{inc.length} transactions</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Net</p>
              <p className={`text-lg font-bold ${totalIn - totalOut >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(totalIn - totalOut)}</p>
            </div>
          </div>

          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">By category</h3>
          <div className="space-y-1.5 mb-5">
            {byCat.map(([cat, val], i) => (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-24 text-xs text-slate-600 truncate">{cat}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${totalOut > 0 ? (val / totalOut) * 100 : 0}%`, background: COLORS[i % COLORS.length] }} />
                </div>
                <div className="w-28 text-right text-xs font-semibold text-slate-700">{fmt(val)}</div>
                <div className="w-10 text-right text-[10px] text-slate-400">{totalOut > 0 ? ((val / totalOut) * 100).toFixed(0) : 0}%</div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Transactions (you can fix the category)</h3>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-100">
            {out.map((t) => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate">{t.description}</p>
                  {t.date && <p className="text-[10px] text-slate-400">{t.date}</p>}
                </div>
                <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{fmt(t.amount)}</span>
                <select
                  value={t.category}
                  onChange={(e) => setCategory(t.id, e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded-md outline-none focus:border-indigo-500 bg-white"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={doImport}
            disabled={imported || out.length === 0}
            className={`mt-4 w-full font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer ${imported ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
          >
            {imported ? <><Check className="w-4 h-4" /> Imported into tracker</> : <>Import {out.length} expenses into tracker</>}
          </button>
          {imported && (
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              The expenses were added to the list below and appear in the chart. Re-importing will double the values.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

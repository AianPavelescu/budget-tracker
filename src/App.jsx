import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trash2, AlertTriangle, Wallet, Plus, Info, X, ShieldCheck } from "lucide-react";
import { storage } from "./lib/storage";
import BankStatementUpload from "./components/BankStatementUpload";
import { workingDaysInMonth, workdayHolidaysInMonth } from "./lib/holidays";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6", "#d946ef", "#0ea5e9", "#f43f5e"];

const DEFAULT_CATEGORIES = ["Rent", "Groceries", "Utilities", "Transport", "Dining", "Entertainment", "Health", "Savings/Investments", "Subscriptions", "Shopping", "Travel", "Education", "Other"];

export default function App() {
  const [salary, setSalary] = useState("");
  const [vouchers, setVouchers] = useState("900");
  const [expenses, setExpenses] = useState([]);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [subs, setSubs] = useState([]);
  const [subName, setSubName] = useState("");
  const [subAmt, setSubAmt] = useState("");
  const [wants, setWants] = useState([]);
  const [wantName, setWantName] = useState("");
  const [wantPrice, setWantPrice] = useState("");
  const [totalSavings, setTotalSavings] = useState("0");
  const [cycleStartSavings, setCycleStartSavings] = useState(null);
  const [cycleDay, setCycleDay] = useState(25);
  const [voucherDay, setVoucherDay] = useState(0); // 0 = auto (last working day)
  const [loaded, setLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Billing cycle: cycleDay of month N → (cycleDay-1) of month N+1.
  const today = new Date();
  const daysThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const effectiveCycleDay = Math.min(cycleDay, daysThisMonth);
  const daysPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const prevEffective = Math.min(cycleDay, daysPrevMonth);
  const cycleAnchor = today.getDate() >= effectiveCycleDay
    ? new Date(today.getFullYear(), today.getMonth(), effectiveCycleDay)
    : new Date(today.getFullYear(), today.getMonth() - 1, prevEffective);
  const cycleEndMonth = new Date(cycleAnchor.getFullYear(), cycleAnchor.getMonth() + 1, 1);
  const daysEndMonth = new Date(cycleEndMonth.getFullYear(), cycleEndMonth.getMonth() + 1, 0).getDate();
  const cycleEndDay = Math.min(cycleDay, daysEndMonth) - 1 || Math.min(cycleDay, daysEndMonth);
  const monthKey = `${cycleEndMonth.getFullYear()}-${String(cycleEndMonth.getMonth() + 1).padStart(2, "0")}-cd${cycleDay}`;
  const storageKey = `budget:${monthKey}`;

  // Voucher date: user-chosen day or auto (last working day of calendar month)
  const lastDayOfMonth = new Date(cycleEndMonth.getFullYear(), cycleEndMonth.getMonth() + 1, 0);
  let bonusDate;
  if (voucherDay > 0) {
    const maxDay = lastDayOfMonth.getDate();
    bonusDate = new Date(cycleEndMonth.getFullYear(), cycleEndMonth.getMonth(), Math.min(voucherDay, maxDay));
  } else {
    bonusDate = new Date(lastDayOfMonth);
    while (bonusDate.getDay() === 0 || bonusDate.getDay() === 6) {
      bonusDate.setDate(bonusDate.getDate() - 1);
    }
  }
  const bonusReached = today >= bonusDate;
  const bonusFmt = bonusDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  useEffect(() => {
    (async () => {
      try {
        const cdr = await storage.get("budget:cycleDay");
        if (cdr) setCycleDay(parseInt(cdr.value) || 25);
      } catch (e) {}
      try {
        const vdr = await storage.get("budget:voucherDay");
        if (vdr) setVoucherDay(parseInt(vdr.value) || 0);
      } catch (e) {}
      try {
        const res = await storage.get(storageKey);
        if (res) {
          const data = JSON.parse(res.value);
          setSalary(data.salary || "");
          if (data.vouchers !== undefined) setVouchers(data.vouchers);
          setExpenses(data.expenses || []);
        }
      } catch (e) { /* no data yet */ }
      try {
        const sres = await storage.get("budget:subscriptions");
        if (sres) setSubs(JSON.parse(sres.value));
      } catch (e) { /* none */ }
      try {
        const wres = await storage.get("budget:wants");
        if (wres) setWants(JSON.parse(wres.value));
      } catch (e) { /* none */ }
      let loadedTotal = 0;
      try {
        const tres = await storage.get("budget:totalSavings");
        if (tres) {
          loadedTotal = parseFloat(tres.value) || 0;
          setTotalSavings(tres.value);
        }
      } catch (e) { /* none */ }
      try {
        const csres = await storage.get(`budget:cycleStartSavings:${monthKey}`);
        if (csres) {
          setCycleStartSavings(parseFloat(csres.value));
        } else {
          setCycleStartSavings(loadedTotal);
          storage.set(`budget:cycleStartSavings:${monthKey}`, String(loadedTotal)).catch(() => {});
        }
      } catch (e) {
        setCycleStartSavings(loadedTotal);
        storage.set(`budget:cycleStartSavings:${monthKey}`, String(loadedTotal)).catch(() => {});
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    storage.set(storageKey, JSON.stringify({ salary, vouchers, expenses })).catch(() => {});
  }, [salary, vouchers, expenses, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storage.set("budget:subscriptions", JSON.stringify(subs)).catch(() => {});
  }, [subs, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storage.set("budget:wants", JSON.stringify(wants)).catch(() => {});
  }, [wants, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storage.set("budget:totalSavings", totalSavings).catch(() => {});
  }, [totalSavings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storage.set("budget:cycleDay", String(cycleDay)).catch(() => {});
  }, [cycleDay, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storage.set("budget:voucherDay", String(voucherDay)).catch(() => {});
  }, [voucherDay, loaded]);

  const addWant = () => {
    const p = parseFloat(wantPrice);
    if (!wantName.trim() || !p || p <= 0) return;
    setWants([...wants, { id: Date.now(), name: wantName.trim(), price: p }]);
    setWantName("");
    setWantPrice("");
  };
  const removeWant = (id) => setWants(wants.filter((w) => w.id !== id));

  const addSub = () => {
    const a = parseFloat(subAmt);
    if (!subName.trim() || !a || a <= 0) return;
    setSubs([...subs, { id: Date.now(), name: subName.trim(), amount: a }]);
    setSubName("");
    setSubAmt("");
  };
  const removeSub = (id) => setSubs(subs.filter((s) => s.id !== id));
  const subsTotal = subs.reduce((s, x) => s + x.amount, 0);

  const addExpense = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setExpenses([...expenses, { id: Date.now(), desc: desc.trim() || category, amount: amt, category }]);
    if (category === "Savings/Investments") {
      setTotalSavings(String(((parseFloat(totalSavings) || 0) + amt).toFixed(2)));
    }
    setDesc("");
    setAmount("");
  };

  const removeExpense = (id) => {
    const target = expenses.find((e) => e.id === id);
    if (target && target.category === "Savings/Investments") {
      setTotalSavings(String(Math.max(0, (parseFloat(totalSavings) || 0) - target.amount).toFixed(2)));
    }
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  // Import parsed bank-statement transactions as expenses.
  const importTransactions = (txns) => {
    const toAdd = txns.map((t) => ({
      id: t.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      desc: t.description || t.category,
      amount: t.amount,
      category: t.category,
    }));
    if (toAdd.length === 0) return;
    setExpenses((prev) => [...prev, ...toAdd]);
    const savingsDelta = toAdd
      .filter((e) => e.category === "Savings/Investments")
      .reduce((s, e) => s + e.amount, 0);
    if (savingsDelta > 0) {
      setTotalSavings((prev) => String(((parseFloat(prev) || 0) + savingsDelta).toFixed(2)));
    }
  };

  // Wipe every "budget:*" key from this browser and reload to a clean slate.
  const confirmClear = async () => {
    await storage.clearPrefix("budget:");
    window.location.reload();
  };

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0) + subsTotal;
  const baseSalary = parseFloat(salary) || 0;
  const voucherAmt = parseFloat(vouchers) || 0;
  const salaryNum = baseSalary > 0 && bonusReached ? baseSalary + voucherAmt : baseSalary;

  // Working hours in the cycle's end calendar month: weekdays minus RO legal holidays, × 8
  const wmYear = cycleEndMonth.getFullYear();
  const wmMonth = cycleEndMonth.getMonth();
  const monthHolidays = workdayHolidaysInMonth(wmYear, wmMonth);
  const workingDays = workingDaysInMonth(wmYear, wmMonth);
  const workingHours = workingDays * 8;
  const hourlyRate = workingHours > 0 ? baseSalary / workingHours : 0;
  const remaining = salaryNum - totalSpent;
  const percentUsed = salaryNum > 0 ? (totalSpent / salaryNum) * 100 : 0;
  const overBudget = salaryNum > 0 && totalSpent > salaryNum;
  const warning = salaryNum > 0 && percentUsed >= 80 && !overBudget;

  const chartData = Object.values(
    [...expenses, ...(subsTotal > 0 ? [{ category: "Subscriptions", amount: subsTotal }] : [])].reduce((acc, e) => {
      acc[e.category] = acc[e.category] || { name: e.category, value: 0 };
      acc[e.category].value += e.amount;
      return acc;
    }, {})
  );

  const fmt = (n) => `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;

  const savingsTarget = baseSalary * 0.10;
  const savingsActual = expenses
    .filter((e) => e.category === "Savings/Investments")
    .reduce((s, e) => s + e.amount, 0);
  const savingsHealthy = baseSalary > 0 && savingsActual >= savingsTarget;
  const savingsGap = Math.max(0, savingsTarget - savingsActual);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Wallet className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Monthly Budget Tracker</h1>
            <p className="text-sm text-slate-500">Cycle: {cycleAnchor.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(cycleEndMonth.getFullYear(), cycleEndMonth.getMonth(), cycleEndDay).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              title="Data & privacy"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              title="Delete everything saved in this browser"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear data
            </button>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Cycle starts on day</label>
            <input
              type="number"
              min="1" max="31"
              value={cycleDay}
              onChange={(e) => { const v = Math.max(1, Math.min(31, parseInt(e.target.value) || 1)); setCycleDay(v); }}
              className="w-14 px-2 py-1 border border-slate-300 rounded-md text-sm text-center outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {overBudget && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Over budget!</p>
              <p className="text-sm text-red-700">You've exceeded your salary by {fmt(totalSpent - salaryNum)}.</p>
            </div>
          </div>
        )}
        {warning && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">You've used {percentUsed.toFixed(0)}% of your budget.</p>
          </div>
        )}
        {baseSalary > 0 && (
          savingsHealthy ? (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-semibold text-emerald-900">Savings: Healthy</p>
                <p className="text-sm text-emerald-700">You're saving {fmt(savingsActual)} this cycle — at or above your 10% target ({fmt(savingsTarget)}).</p>
              </div>
            </div>
          ) : (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Wallet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Savings reminder</p>
                <p className="text-sm text-blue-700">
                  Consider saving or investing <strong>{fmt(savingsGap)}</strong> more to hit your 10% target of {fmt(savingsTarget)}.
                  {savingsActual > 0 && ` So far this cycle: ${fmt(savingsActual)}.`}
                </p>
              </div>
            </div>
          )
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <label className="text-xs font-semibold text-slate-500 uppercase">Monthly Salary</label>
            <div className="flex items-baseline gap-1 mt-2">
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="0.00"
                className="text-2xl font-bold text-slate-900 w-full outline-none min-w-0"
              />
              <span className="text-sm font-semibold text-slate-500">RON</span>
            </div>
            {baseSalary > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Meal Vouchers</label>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    value={vouchers}
                    onChange={(e) => setVouchers(e.target.value)}
                    placeholder="0"
                    className="text-base font-semibold text-slate-700 w-full outline-none min-w-0"
                  />
                  <span className="text-xs font-semibold text-slate-500">RON</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Added on day</label>
                  <select
                    value={voucherDay}
                    onChange={(e) => setVoucherDay(parseInt(e.target.value))}
                    className="text-xs px-2 py-1 border border-slate-300 rounded-md outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value={0}>Auto (last working day)</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <p className={`text-xs mt-1 ${bonusReached ? "text-emerald-600" : "text-slate-400"}`}>
                  {bonusReached ? `Added on ${bonusFmt}` : `Auto-added on ${bonusFmt}`}
                </p>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Spent</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{fmt(totalSpent)}</p>
          </div>
          <div className={`rounded-xl p-5 shadow-sm border ${overBudget ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase">Remaining</p>
            <p className={`text-2xl font-bold mt-2 ${overBudget ? "text-red-600" : "text-emerald-600"}`}>{fmt(remaining)}</p>
          </div>
        </div>

        {salaryNum > 0 && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-slate-200">
            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>BUDGET USED</span>
              <span>{percentUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${overBudget ? "bg-red-500" : percentUsed >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
          </div>
        )}

        {(() => {
          const totalNum = parseFloat(totalSavings) || 0;
          const startNum = cycleStartSavings ?? 0;
          const delta = totalNum - startNum;
          const pct = startNum > 0 ? (delta / startNum) * 100 : 0;
          const positive = delta > 0;
          const negative = delta < 0;
          const color = positive ? "text-emerald-600" : negative ? "text-red-600" : "text-slate-400";
          const sign = positive ? "+" : "";
          return (
            <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-slate-900">Total Savings</h2>
                <span className={`text-sm font-bold ${color}`}>
                  {sign}{delta.toFixed(2)} RON {startNum > 0 && `(${sign}${pct.toFixed(2)}%)`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">Linked to Savings/Investments expenses. Edit manually any time.</p>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={totalSavings}
                  onChange={(e) => setTotalSavings(e.target.value)}
                  placeholder="0.00"
                  className="text-3xl font-bold text-slate-900 w-full outline-none min-w-0"
                />
                <span className="text-base font-semibold text-slate-500">RON</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                This cycle started at {startNum.toFixed(2)} RON.
              </p>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 gap-6">
          <BankStatementUpload onImport={importTransactions} />

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-900 mb-4">Add Expense</h2>
            <div className="space-y-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExpense()}
                placeholder="Amount"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExpense()}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white"
              >
                {DEFAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button
                type="button"
                onClick={addExpense}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <h3 className="font-semibold text-slate-900 mt-6 mb-3">Expenses ({expenses.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expenses.length === 0 && <p className="text-sm text-slate-400">No expenses yet.</p>}
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate text-sm">{e.desc}</p>
                    <p className="text-xs text-slate-500">{e.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{fmt(e.amount)}</span>
                    <button onClick={() => removeExpense(e.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Subscriptions</h2>
              <span className="text-sm font-semibold text-indigo-600">{fmt(subsTotal)} / mo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 mb-4">
              <input
                type="text"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSub()}
                placeholder="e.g. Netflix"
                className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                value={subAmt}
                onChange={(e) => setSubAmt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSub()}
                placeholder="Amount"
                className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={addSub}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {subs.length === 0 && <p className="text-sm text-slate-400">No subscriptions yet.</p>}
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900 text-sm">{s.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{fmt(s.amount)}</span>
                    <button onClick={() => removeSub(s.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-slate-900">Wants — cost in work hours</h2>
              {hourlyRate > 0 && (
                <span className="text-sm font-semibold text-purple-600">{fmt(hourlyRate)}/hr</span>
              )}
            </div>
            <div className="mb-4">
              <p className="text-xs text-slate-500">
                Based on {workingHours} working hours this month ({workingDays} working days × 8h), excluding the bonus.
              </p>
              {monthHolidays.length > 0 && (
                <ul className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                  {monthHolidays.map((h) => (
                    <li key={h.date.toISOString()}>
                      * {h.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })} isn't counted because it's {h.name}.
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 mb-4">
              <input
                type="text"
                value={wantName}
                onChange={(e) => setWantName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWant()}
                placeholder="e.g. Sneakers"
                className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500"
              />
              <input
                type="number"
                value={wantPrice}
                onChange={(e) => setWantPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWant()}
                placeholder="Price"
                className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={addWant}
                className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {wants.length === 0 && <p className="text-sm text-slate-400">No wants added yet.</p>}
              {wants.map((w) => {
                const hours = hourlyRate > 0 ? w.price / hourlyRate : 0;
                return (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{w.name}</p>
                      <p className="text-xs text-slate-600">{fmt(w.price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-purple-700">
                        {hourlyRate > 0 ? `${hours.toFixed(1)} h` : "—"}
                      </span>
                      <button onClick={() => removeWant(w.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-900 mb-4">Category Breakdown</h2>
            {chartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Add expenses to see the chart</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${((e.value / totalSpent) * 100).toFixed(0)}%`}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {showInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowInfo(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Your data &amp; privacy
                </h2>
                <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                  <span>Everything you enter stays <strong>only in this browser, on this device</strong> — it's saved in your browser's local storage.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                  <span>Nothing is uploaded. There's no server, no account and no tracking — the app's owner cannot see your data.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                  <span>Bank statements are read locally in your browser. The file never leaves your device.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold flex-shrink-0">!</span>
                  <span>Your data isn't synced across devices and isn't encrypted — anyone using this same browser can see it. On a shared computer, use <strong>Clear data</strong> when you're done.</span>
                </li>
              </ul>
              <button
                onClick={() => setShowInfo(false)}
                className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {showClearConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-slate-900">Are you sure?</h2>
              </div>
              <p className="text-sm text-slate-600 mb-5">
                This permanently deletes everything saved in this browser — salary, expenses, subscriptions, wants, savings, learned categories and imported transactions. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClear}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Clear all data
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">Made by Aian Pavelescu, 2026</p>
          <p className="text-xs text-slate-400 mt-1">All data is stored locally in your browser. The application owner has no access to your financial information.</p>
        </footer>
      </div>
    </div>
  );
}

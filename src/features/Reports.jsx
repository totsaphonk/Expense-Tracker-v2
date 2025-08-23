// src/features/Reports.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../data/app-state";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

function toISO(d) { return new Date(d).toISOString().slice(0, 10); }

export default function Reports() {
  const { ready, settings, categories, expenses, getCycleRange } = useApp();
  const [mode, setMode] = useState("cycle"); // 'cycle' | 'custom'
  const [custom, setCustom] = useState({
    from: toISO(new Date()),
    to: toISO(new Date()),
  });
  const [cycleOffset, setCycleOffset] = useState(0);

  const range = useMemo(() => {
    if (mode === "cycle") {
      const { start, end } = getCycleRange(
        Number(settings.cycleStartDay || 1),
        Number(cycleOffset || 0)
      );
      return { from: toISO(start), to: toISO(end) };
    } else {
      return { from: custom.from, to: custom.to };
    }
  }, [mode, custom, settings.cycleStartDay, cycleOffset, getCycleRange]);

  const filtered = useMemo(() => {
    if (!ready) return [];
    const from = new Date(range.from);
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    return expenses.filter((e) => {
      const d = new Date(e.dateISO);
      return d >= from && d <= to;
    });
  }, [ready, range, expenses]);

  const rows = useMemo(() => {
    const map = new Map();
    categories.forEach((c) =>
      map.set(c.id, { categoryId: c.id, name: c.name, budget: Number(c.budget || 0), spent: 0 })
    );
    filtered.forEach((e) => {
      const row = map.get(e.categoryId);
      if (row) row.spent += Number(e.amount || 0);
    });
    return Array.from(map.values()).map((r) => ({
      ...r,
      remain: r.budget - r.spent,
      over: Math.max(0, r.spent - r.budget),
    }));
  }, [categories, filtered]);

  const totals = rows.reduce(
    (a, r) => {
      a.budget += r.budget;
      a.spent += r.spent;
      return a;
    },
    { budget: 0, spent: 0 }
  );
  const remain = totals.budget - totals.spent;

  function exportCSV() {
    const header = ["Category", "Budget", "Spent", "Remain"];
    const body = rows.map((r) => [
      r.name.replaceAll(",", " "),
      r.budget,
      r.spent,
      r.remain,
    ]);
    const all = [header, ...body];
    const csv = all.map((line) => line.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const fileLabel =
      mode === "cycle"
        ? `cycle_${range.from}_${range.to}`
        : `custom_${range.from}_${range.to}`;
    a.download = `expense_report_${fileLabel}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const periodLabel = `${new Date(range.from).toLocaleDateString("th-TH")} - ${new Date(range.to).toLocaleDateString("th-TH")}`;

  return (
    <section className="mt-4 space-y-4">
      {/* Controls */}
      <div className="rounded-2xl border bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm">โหมดรายงาน:</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="border rounded-xl px-3 py-2"
          >
            <option value="cycle">ตามรอบตัดงบ</option>
            <option value="custom">ช่วงวันที่กำหนดเอง</option>
          </select>
        </div>

        {mode === "cycle" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCycleOffset((v) => v + 1)}
              className="px-3 py-2 border rounded-xl"
              title="ย้อนรอบก่อนหน้า"
            >
              ◀
            </button>
            <div className="text-sm text-gray-600">{periodLabel}</div>
            <button
              onClick={() => setCycleOffset((v) => Math.max(0, v - 1))}
              className="px-3 py-2 border rounded-xl"
              title="ไปรอบถัดไป"
            >
              ▶
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm">จาก</label>
              <input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom((s) => ({ ...s, from: e.target.value }))}
                className="border rounded-xl px-3 py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">ถึง</label>
              <input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom((s) => ({ ...s, to: e.target.value }))}
                className="border rounded-xl px-3 py-2"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button onClick={exportCSV} className="px-4 py-2 bg-black text-white rounded-2xl">
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric title="งบรวม" value={thb.format(totals.budget)} />
        <Metric title="ใช้ไปแล้ว" value={thb.format(totals.spent)} />
        <Metric title="คงเหลือ" value={thb.format(remain)} danger={remain < 0} />
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="py-2 pr-4">หมวดหมู่</th>
              <th className="py-2 pr-4">งบ (บาท)</th>
              <th className="py-2 pr-4">ใช้จริง (บาท)</th>
              <th className="py-2 pr-4">คงเหลือ (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.categoryId} className="border-t">
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">{thb.format(r.budget)}</td>
                <td className="py-2 pr-4">{thb.format(r.spent)}</td>
                <td className={`py-2 pr-4 ${r.remain < 0 ? "text-red-600 font-medium" : ""}`}>
                  {thb.format(r.remain)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-gray-500">
                  ไม่พบข้อมูลในช่วงที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ title, value, danger }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${danger ? "text-red-600" : ""}`}>
      <div className="text-xs mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

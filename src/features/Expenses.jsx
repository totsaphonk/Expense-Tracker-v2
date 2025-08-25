// src/features/Expenses.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../data/app-state";
import { useI18n } from "../i18n";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

function toISO(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export default function Expenses() {
  const t = useI18n();
  const { ready, categories, expenses, setExpenses, settings, getCycleRange } =
    useApp();
  const locale = settings?.locale || "th-TH";

  // view: 'list' | 'summary'
  const [view, setView] = useState("list");

  // ตัวกรอง (ใช้ร่วมกันทั้ง 2 มุมมอง)
  const [filters, setFilters] = useState({
    q: "",
    from: "",
    to: "",
    cat: "",
    amin: "",
    amax: "",
  });

  // ปุ่มลัด “ช่วงรอบปัจจุบัน”
  function fillCurrentCycle() {
    const { start, end } = getCycleRange(
      Number(settings?.cycleStartDay || 1),
      0
    );
    setFilters((f) => ({ ...f, from: toISO(start), to: toISO(end) }));
  }
  function clearDates() {
    setFilters((f) => ({ ...f, from: "", to: "" }));
  }

  if (!ready) return null;

  // กรองรายการ (ใช้กับทั้ง 2 โหมด)
  const filtered = useMemo(() => {
    let arr = [...expenses];

    if (filters.from) {
      const f = new Date(filters.from);
      arr = arr.filter((e) => new Date(e.dateISO) >= f);
    }
    if (filters.to) {
      const t = new Date(filters.to);
      t.setHours(23, 59, 59, 999);
      arr = arr.filter((e) => new Date(e.dateISO) <= t);
    }
    if (filters.cat) arr = arr.filter((e) => e.categoryId === filters.cat);
    if (filters.q)
      arr = arr.filter((e) =>
        (e.note || "").toLowerCase().includes(filters.q.toLowerCase())
      );
    if (filters.amin)
      arr = arr.filter((e) => Number(e.amount) >= Number(filters.amin));
    if (filters.amax)
      arr = arr.filter((e) => Number(e.amount) <= Number(filters.amax));

    return arr.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  }, [expenses, filters]);

  // ลบรายการ (ในโหมด List)
  function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  // -------- Summary (สรุปรายหมวด + รวม) --------
  const summaryRows = useMemo(() => {
    // map หมวด → { budget, spent }
    const map = new Map();
    categories.forEach((c) =>
      map.set(c.id, {
        categoryId: c.id,
        name: c.name,
        budget: Number(c.budget || 0),
        spent: 0,
      })
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

  const totals = summaryRows.reduce(
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
    const body = summaryRows.map((r) => [
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
      filters.from && filters.to
        ? `range_${filters.from}_${filters.to}`
        : "all";
    a.download = `expense_summary_${fileLabel}.csv`;

    a.click();
    URL.revokeObjectURL(a.href);
  }

  // label ช่วงวันที่ (เพื่อแสดงผลบนหัว Summary)
  const periodLabel =
    filters.from && filters.to
      ? `${new Date(filters.from).toLocaleDateString(locale)} - ${new Date(
          filters.to
        ).toLocaleDateString(locale)}`
      : locale === "en-US"
      ? "All time"
      : "ทั้งหมด";

  return (
    <section className="mt-4 space-y-4">
      {/* ตัวกรอง & สลับมุมมอง */}
      <div className="rounded-2xl border bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="flex items-center gap-2 md:col-span-2">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 rounded-xl border touch-manipulation ${
              view === "list" ? "bg-black text-white" : "bg-white"
            }`}
          >
            {locale === "en-US" ? "List" : "รายการ"}
          </button>
          <button
            onClick={() => setView("summary")}
            className={`px-3 py-2 rounded-xl border touch-manipulation ${
              view === "summary" ? "bg-black text-white" : "bg-white"
            }`}
          >
            {locale === "en-US" ? "Summary" : "สรุป"}
          </button>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs">
            {locale === "en-US" ? "Search (notes)" : "คำค้น (ในหมายเหตุ)"}
          </label>
          <input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder={
              locale === "en-US"
                ? "e.g., Starbucks, gas"
                : "เช่น Starbucks, น้ำมัน"
            }
            className="w-full border rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs">
            {locale === "en-US" ? "From" : "จากวันที่"}
          </label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs">
            {locale === "en-US" ? "To" : "ถึงวันที่"}
          </label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border rounded-xl px-3 py-2"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={fillCurrentCycle}
            className="px-3 py-2 border rounded-xl touch-manipulation"
            title={locale === "en-US" ? "Current cycle" : "รอบปัจจุบัน"}
          >
            {locale === "en-US" ? "This cycle" : "รอบนี้"}
          </button>
          <button
            type="button"
            onClick={clearDates}
            className="px-3 py-2 border rounded-xl touch-manipulation"
          >
            {locale === "en-US" ? "Clear" : "ล้างวันที่"}
          </button>
        </div>

        <div>
          <label className="text-xs">
            {locale === "en-US" ? "Category" : "หมวดหมู่"}
          </label>
          <select
            value={filters.cat || ""}
            onChange={(e) => setFilters({ ...filters, cat: e.target.value })}
            className="w-full border rounded-xl px-3 py-2"
          >
            <option value="">{locale === "en-US" ? "All" : "ทั้งหมด"}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs">
              {locale === "en-US" ? "Amount ≥" : "จำนวนเงิน ≥"}
            </label>
            <input
              type="number"
              value={filters.amin}
              onChange={(e) => setFilters({ ...filters, amin: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-right"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs">{locale === "en-US" ? "≤" : "≤"}</label>
            <input
              type="number"
              value={filters.amax}
              onChange={(e) => setFilters({ ...filters, amax: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-right"
            />
          </div>
        </div>
      </div>

      {/* -------- View: List -------- */}
      {view === "list" && (
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold mb-3">
            {locale === "en-US"
              ? "Expenses (filtered)"
              : "รายการใช้จ่าย (ตามตัวกรอง)"}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {filtered.length === 0 && (
              <div className="text-sm text-gray-500">
                {locale === "en-US" ? "No items" : "ไม่พบรายการ"}
              </div>
            )}
            {filtered.map((e) => {
              const cat = categories.find((c) => c.id === e.categoryId);
              return (
                <div
                  key={e.id}
                  className="rounded-xl border p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {cat?.name ||
                        (locale === "en-US"
                          ? "(category deleted)"
                          : "(หมวดถูกลบ)")}{" "}
                      <span className="text-gray-400">
                        • {new Date(e.dateISO).toLocaleDateString(locale)}
                      </span>
                    </div>
                    {e.note && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {e.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">{thb.format(e.amount)}</div>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="w-9 h-9 grid place-items-center border rounded-xl touch-manipulation"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------- View: Summary -------- */}
      {view === "summary" && (
        <>
          <div className="rounded-2xl border bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-sm text-gray-600">
              {locale === "en-US" ? "Range:" : "ช่วงวันที่:"} {periodLabel}
            </div>
            <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-black text-white rounded-2xl touch-manipulation"
              >
                {locale === "en-US" ? "Export CSV" : "Export CSV"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Metric
              title={locale === "en-US" ? "Total Budget" : "งบรวม"}
              value={thb.format(totals.budget)}
            />
            <Metric
              title={locale === "en-US" ? "Spent" : "ใช้ไปแล้ว"}
              value={thb.format(totals.spent)}
            />
            <Metric
              title={locale === "en-US" ? "Remaining" : "คงเหลือ"}
              value={thb.format(remain)}
              danger={remain < 0}
            />
          </div>

          <div className="rounded-2xl border bg-white p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="py-2 pr-4">
                    {locale === "en-US" ? "Category" : "หมวดหมู่"}
                  </th>
                  <th className="py-2 pr-4">
                    {locale === "en-US" ? "Budget (THB)" : "งบ (บาท)"}
                  </th>
                  <th className="py-2 pr-4">
                    {locale === "en-US" ? "Spent (THB)" : "ใช้จริง (บาท)"}
                  </th>
                  <th className="py-2 pr-4">
                    {locale === "en-US" ? "Remaining (THB)" : "คงเหลือ (บาท)"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r) => (
                  <tr key={r.categoryId} className="border-t">
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4">{thb.format(r.budget)}</td>
                    <td className="py-2 pr-4">{thb.format(r.spent)}</td>
                    <td
                      className={`py-2 pr-4 ${
                        r.remain < 0 ? "text-red-600 font-medium" : ""
                      }`}
                    >
                      {thb.format(r.remain)}
                    </td>
                  </tr>
                ))}
                {summaryRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-500">
                      {locale === "en-US"
                        ? "No data in selected range"
                        : "ไม่พบข้อมูลในช่วงที่เลือก"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ title, value, danger }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        danger ? "text-red-600" : ""
      }`}
    >
      <div className="text-xs mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

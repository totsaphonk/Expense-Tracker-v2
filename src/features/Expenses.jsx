// src/features/Expenses.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../data/app-state";
import { useI18n } from "../i18n";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

export default function Expenses() {
  const t = useI18n();
  const { ready, categories, expenses, setExpenses, settings } = useApp();
  const locale = settings?.locale || "th-TH";
  const [filters, setFilters] = useState({
    q: "",
    from: "",
    to: "",
    cat: "",
    amin: "",
    amax: "",
  });
  if (!ready) return null;

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

  function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <section className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs">{t("exp_search")}</label>
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
          <label className="text-xs">{t("exp_from")}</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs">{t("exp_to")}</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs">{t("exp_cat")}</label>
          <select
            value={filters.cat || ""}
            onChange={(e) => setFilters({ ...filters, cat: e.target.value })}
            className="w-full border rounded-xl px-3 py-2"
          >
            <option value="">{t("exp_all")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs">{t("exp_amt_ge")}</label>
            <input
              type="number"
              value={filters.amin}
              onChange={(e) => setFilters({ ...filters, amin: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-right"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs">{t("exp_amt_le")}</label>
            <input
              type="number"
              value={filters.amax}
              onChange={(e) => setFilters({ ...filters, amax: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-right"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h3 className="font-semibold mb-3">{t("exp_title")}</h3>
        <div className="grid grid-cols-1 gap-2">
          {filtered.length === 0 && (
            <div className="text-sm text-gray-500">{t("exp_empty")}</div>
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
                    {cat?.name || t("exp_deleted_cat")}{" "}
                    <span className="text-gray-400">
                      • {new Date(e.dateISO).toLocaleDateString(locale)}
                    </span>
                  </div>
                  {e.note && (
                    <div className="text-xs text-gray-500 mt-0.5">{e.note}</div>
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
    </section>
  );
}

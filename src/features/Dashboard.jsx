// src/features/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../data/app-state";
import { useI18n } from "../i18n";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function colorForCategory(name, idx = 0) {
  const base = hashString(name + String(idx));
  const h = base % 360;
  const s = 65 + (base % 10);
  const l = 50;
  return hslToHex(h, s, l);
}

export default function Dashboard() {
  const t = useI18n();
  const { ready, settings, categories, expenses, getCycleRange } = useApp();
  const [cycleOffset, setCycleOffset] = useState(0);

  const cycleStartDay = Number(settings?.cycleStartDay ?? 1);
  const { start: cycleStart, end: cycleEnd } = useMemo(
    () => getCycleRange(cycleStartDay, Number(cycleOffset || 0)),
    [cycleStartDay, cycleOffset, getCycleRange]
  );
  const locale = settings?.locale || "th-TH";

  const safeCategories = categories ?? [];
  const safeExpenses = expenses ?? [];

  const expensesInCycle = useMemo(() => {
    if (!ready) return [];
    return safeExpenses.filter((e) => {
      const d = new Date(e.dateISO);
      return d >= cycleStart && d <= cycleEnd;
    });
  }, [ready, safeExpenses, cycleStart, cycleEnd]);

  const totalsByCategory = useMemo(() => {
    const map = {};
    safeCategories.forEach((c) => (map[c.id] = 0));
    expensesInCycle.forEach((e) => {
      map[e.categoryId] = (map[e.categoryId] || 0) + Number(e.amount || 0);
    });
    return map;
  }, [safeCategories, expensesInCycle]);

  const sumBudget = useMemo(
    () => safeCategories.reduce((a, c) => a + Number(c.budget || 0), 0),
    [safeCategories]
  );
  const sumSpent = useMemo(
    () =>
      Object.values(totalsByCategory).reduce((a, v) => a + Number(v || 0), 0),
    [totalsByCategory]
  );
  const sumRemain = sumBudget - sumSpent;

  const categoryColors = useMemo(() => {
    const m = {};
    safeCategories.forEach((c, idx) => {
      m[c.id] =
        c.color && /^#([0-9a-f]{3}){1,2}$/i.test(c.color)
          ? c.color
          : colorForCategory(c.name, idx);
    });
    return m;
  }, [safeCategories]);

  const pieData = useMemo(
    () =>
      safeCategories.map((c) => ({
        id: c.id,
        name: c.name,
        value: totalsByCategory[c.id] || 0,
        fill: categoryColors[c.id],
      })),
    [safeCategories, totalsByCategory, categoryColors]
  );

  const rows = useMemo(() => {
    if (!ready) return [];
    const dayMs = 86400000;
    const out = [];
    const start = new Date(cycleStart);
    const end = new Date(cycleEnd);
    for (let tMs = start.getTime(); tMs <= end.getTime(); tMs += dayMs) {
      const d = new Date(tMs).toISOString().slice(0, 10);
      const row = { date: d };
      safeCategories.forEach((c) => (row[c.id] = 0));
      out.push(row);
    }
    const idx = Object.fromEntries(out.map((r, i) => [r.date, i]));
    expensesInCycle.forEach((e) => {
      const k = new Date(e.dateISO).toISOString().slice(0, 10);
      const i = idx[k];
      if (i != null)
        out[i][e.categoryId] =
          (out[i][e.categoryId] || 0) + Number(e.amount || 0);
    });
    return out;
  }, [ready, cycleStart, cycleEnd, safeCategories, expensesInCycle]);

  const periodLabel = `${new Date(cycleStart).toLocaleDateString(
    locale
  )} - ${new Date(cycleEnd).toLocaleDateString(locale)}`;

  return (
    <section className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCycleOffset((v) => v + 1)}
            className="px-3 py-1 border rounded-2xl touch-manipulation"
          >
            ◀
          </button>
          <div className="text-sm text-gray-600">{periodLabel}</div>
          <button
            onClick={() => setCycleOffset((v) => Math.max(0, v - 1))}
            className="px-3 py-1 border rounded-2xl touch-manipulation"
          >
            ▶
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {t("dash_starts", { day: cycleStartDay })}
        </div>
      </div>

      {!ready ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">
          {t("loading")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricCard
              title={t("dash_budget")}
              value={thb.format(sumBudget)}
            />
            <MetricCard title={t("dash_spent")} value={thb.format(sumSpent)} />
            <MetricCard
              title={t("dash_remain")}
              value={thb.format(sumRemain)}
              danger={sumRemain < 0}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-white p-4">
              <h3 className="font-semibold mb-2">{t("dash_pie")}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={entry.id || idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => thb.format(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <h3 className="font-semibold mb-2">{t("dash_bar")}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => thb.format(Number(v))} />
                    <Legend />
                    {safeCategories.map((c) => (
                      <Bar
                        key={c.id}
                        dataKey={c.id}
                        name={c.name}
                        stackId="a"
                        fill={categoryColors[c.id]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({ title, value, danger }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        danger ? "text-red-600" : ""
      }`}
    >
      <div className="text-sm mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

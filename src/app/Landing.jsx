// src/app/Landing.jsx
import React, { useMemo, useEffect, useState } from "react";
import { useApp } from "../data/app-state";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  RefreshCw,
  Settings as SettingsIcon,
  Wallet,
} from "lucide-react";

/* -------------------- Quote Generators (>=100/ภาษา) -------------------- */
// ไทย
function getQuotesTH() {
  const A = [
    "เงินเก็บ",
    "วินัย",
    "ตัวเลข",
    "เป้าหมาย",
    "งบประมาณ",
    "การบันทึก",
    "ความสม่ำเสมอ",
    "การวางแผน",
    "สติ",
    "ทางเลือกเล็กๆ",
  ];
  const B = [
    "คือรากฐานของ",
    "พาไปสู่",
    "ช่วยให้เห็น",
    "ทำให้เกิด",
    "ทำให้ใกล้",
    "เปิดทางให้",
    "ค่อยๆ สร้าง",
    "ปกป้อง",
    "เตือนให้เราเห็น",
    "หล่อหลอมเป็น",
  ];
  const C = [
    "อิสรภาพทางการเงิน",
    "ความมั่นคง",
    "ภาพรวมที่ชัดเจน",
    "อนาคตที่ต้องการ",
    "ผลลัพธ์ที่ยั่งยืน",
    "นิสัยที่ดี",
    "ต้นทุนที่แท้จริง",
    "การตัดสินใจที่แม่นยำ",
    "โอกาสใหม่ๆ",
    "ความสบายใจ",
  ];
  const T = [
    "เริ่มวันนี้ ดีกว่าเมื่อวานเสมอ",
    "รายจ่ายเล็กๆ คือที่มาของผลลัพธ์ใหญ่",
    "รู้ตัวเลขของตัวเอง ชนะไปครึ่งหนึ่ง",
    "บันทึกทุกวัน เหมือนรดน้ำให้ต้นไม้การเงิน",
    "เก็บเล็กผสมน้อย ยั่งยืนกว่าก้าวกระโดด",
    "ใช้จ่ายตามแผน ไม่ใช่ตามอารมณ์",
    "หยุดรั่วเล็กๆ เงินจะอยู่กับเรามากขึ้น",
    "ให้เงินทำงาน ด้วยวินัย ไม่ใช่ด้วยดวง",
    "อนาคตเริ่มจากตัวเลขของวันนี้",
    "เป้าหมายชัด การตัดสินใจจะง่าย",
  ];
  const out = new Set();
  A.forEach((a) =>
    B.forEach((b) => C.forEach((c) => out.add(`${a} ${b}${c}`)))
  );
  T.forEach((t) => out.add(t));
  return Array.from(out); // >100
}

// อังกฤษ
function getQuotesEN() {
  const A = [
    "Discipline",
    "Budgeting",
    "Tracking",
    "Small choices",
    "Consistency",
    "Clear numbers",
    "Focus",
    "Planning",
    "Awareness",
    "Saving",
  ];
  const B = [
    "builds",
    "leads to",
    "reveals",
    "protects",
    "creates",
    "powers",
    "guides",
    "shapes",
    "unlocks",
    "drives",
  ];
  const C = [
    "financial freedom",
    "stability",
    "better decisions",
    "strong habits",
    "long-term results",
    "peace of mind",
    "smart spending",
    "true priorities",
    "new opportunities",
    "your future",
  ];
  const T = [
    "Track today, grow tomorrow.",
    "Small savings, big outcomes.",
    "Know your numbers, own your life.",
    "Water your money tree every day.",
    "Spend on purpose, not on impulse.",
    "Stop the small leaks; keep the wealth.",
    "Let discipline work harder than luck.",
    "Clarity turns goals into action.",
    "Your future starts with today’s numbers.",
    "Progress beats perfection.",
  ];
  const out = new Set();
  A.forEach((a) =>
    B.forEach((b) => C.forEach((c) => out.add(`${a} ${b} ${c}.`)))
  );
  T.forEach((t) => out.add(t));
  return Array.from(out); // >100
}

/* -------------------- Helpers -------------------- */
function percentRemain(total, remain) {
  if (!total) return null; // ไม่มี budget → ไม่คำนวณ
  return Math.max(0, Math.min(100, Math.round((remain / total) * 100)));
}
function remainClass(p) {
  if (p == null) return ""; // ไม่ใส่สี
  if (p <= 20) return "border-red-500 text-red-600";
  if (p <= 50) return "border-yellow-500 text-yellow-600";
  return "border-emerald-500 text-emerald-600";
}
function fmtCurrency(n, locale = "th-TH", cur = "THB") {
  return (n ?? 0).toLocaleString(locale, {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  });
}

/* -------------------- Landing -------------------- */
export default function Landing({ title = "Expense Tracker", onPick }) {
  const { settings, categories, expenses, getCycleRange } = useApp();

  // Snapshot รอบเดือนปัจจุบัน
  const snap = useMemo(() => {
    const startDay = settings?.cycleStartDay ?? 1;
    const { start, end } = getCycleRange(startDay, 0);
    const totalBudget = (categories || []).reduce(
      (s, c) => s + (Number(c.budget) || 0),
      0
    );
    const spent = (expenses || []).reduce((s, e) => {
      const d = new Date(e.dateISO || e.date);
      return d >= start && d <= end ? s + (Number(e.amount) || 0) : s;
    }, 0);
    const remain = Math.max(0, totalBudget - spent);
    const p = totalBudget > 0 ? percentRemain(totalBudget, remain) : null;
    return { start, end, totalBudget, spent, remain, p };
  }, [settings, categories, expenses, getCycleRange]);

  const locale = settings?.locale || "th-TH";
  const currency = settings?.currency || "THB";
  const budgetTxt = snap.totalBudget
    ? fmtCurrency(snap.totalBudget, locale, currency)
    : "-";
  const spentTxt = snap.spent ? fmtCurrency(snap.spent, locale, currency) : "-";
  const remainTxt = snap.totalBudget
    ? fmtCurrency(snap.remain, locale, currency)
    : "-";

  // Random Quote (ตามภาษา) — สุ่มเมื่อเข้าหน้า
  const [quote, setQuote] = useState("");
  useEffect(() => {
    const list = locale === "th-TH" ? getQuotesTH() : getQuotesEN();
    setQuote(list[Math.floor(Math.random() * list.length)]);
  }, [locale]);

  return (
    <div className="min-h-screen text-white bg-[#0d1b2a] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b2545]/90 backdrop-blur safe-top">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <img
            src="/logo-mark.png"
            alt="Logo"
            className="w-12 h-12 rounded-xl object-contain"
          />
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 pt-6 app-content space-y-6">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#163963] to-[#0b2545] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  ดูแลกระเป๋าเงินให้เติบโตอย่างมั่นคง
                </div>
                <div className="text-white/70 text-sm">
                  ภาพรวมเดือนนี้ • ธีมน้ำเงิน–ขาว อ่านง่าย สบายตา
                </div>
              </div>
            </div>
          </section>

          {/* KPI */}
          <section className="grid grid-cols-3 gap-3">
            <Kpi
              label={locale === "th-TH" ? "งบรวม" : "Budget"}
              value={budgetTxt}
            />
            <Kpi
              label={locale === "th-TH" ? "ใช้ไปแล้ว" : "Spent"}
              value={spentTxt}
            />
            <Kpi
              label={locale === "th-TH" ? "คงเหลือ" : "Remaining"}
              value={snap.totalBudget ? `${remainTxt} · ${snap.p}%` : "-"}
              className={remainClass(snap.p)}
              strong
            />
          </section>

          {/* Illustration */}
          <section className="flex flex-col items-center justify-center text-center py-4">
            <img
              src="/money-tree.png"
              alt="Financial Tree"
              className="w-56 h-56 object-contain drop-shadow-lg"
            />
          </section>

          {/* Quote (no border) */}
          <section className="text-center">
            <div className="text-white/85 text-sm leading-snug">{quote}</div>
          </section>
        </div>
      </main>

      {/* Bottom Navigation (ให้ตรงกับ Shell.jsx) */}
      <LandingBottomNav onPick={onPick} />
    </div>
  );
}

/* -------------------- Small Pieces -------------------- */
function Kpi({ label, value, className = "", strong = false }) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-4 text-[#0b1220] shadow-sm ${
        strong ? "ring-1 ring-black/5" : ""
      }`}
    >
      <div className={`text-xs ${strong ? className : "text-gray-500"}`}>
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${strong ? className : ""}`}>
        {value}
      </div>
    </div>
  );
}

function LandingBottomNav({ onPick }) {
  return (
    <div className="md:hidden bottom-nav fixed left-0 right-0 bottom-0 z-40">
      {/* ปุ่มกลาง (Dashboard) */}
      <button
        onClick={() => onPick?.("Dashboard")}
        className="fab absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full shadow-lg grid place-items-center bg-indigo-500 text-white"
        aria-label="Dashboard"
      >
        <LayoutDashboard className="w-7 h-7" />
      </button>

      <div className="flex items-center justify-between px-6 h-16">
        <button
          onClick={() => onPick?.("Add")}
          className="nav-btn rounded-full bg-emerald-500 text-white"
          aria-label="Add"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
        <button
          onClick={() => onPick?.("Expenses")}
          className="nav-btn rounded-full bg-sky-500 text-white"
          aria-label="Expenses"
        >
          <ListChecks className="w-6 h-6" />
        </button>
        <div className="w-16" aria-hidden />
        <button
          onClick={() => onPick?.("Recurring")}
          className="nav-btn rounded-full bg-violet-500 text-white"
          aria-label="Recurring"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
        <button
          onClick={() => onPick?.("Settings")}
          className="nav-btn rounded-full bg-amber-500 text-white"
          aria-label="Settings"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

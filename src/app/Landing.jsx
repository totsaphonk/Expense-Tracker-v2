// src/app/Landing.jsx
import React from "react";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";

const TAB_COLORS = {
  Dashboard: "bg-indigo-500",
  Add: "bg-emerald-500",
  Expenses: "bg-sky-500",
  Recurring: "bg-violet-500",
  Settings: "bg-amber-500",
};

export default function Landing({
  title = "Monthly Expense Helper — v2",
  tabs = [],
  onPick,
}) {
  return (
    <div className="min-h-screen text-white bg-[#0d1b2a] flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b2545]/90 backdrop-blur safe-top">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <img
            src="/logo-mark.png"
            alt="Logo"
            className="w-12 h-12 rounded-xl object-contain"
          />
          <h1 className="font-bold text-lg">Expense Tracker</h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-24 safe-bottom">
          <h2 className="text-xl font-semibold mb-1">Main Menu</h2>
          <p className="text-white/70 text-sm mb-4">
            เลือกเมนูเพื่อเริ่มใช้งาน — โทนน้ำเงิน–ขาวบนพื้นหลังเข้ม
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tabs.map((t) => (
              <button
                key={t.k}
                onClick={() => onPick?.(t.k)}
                className="rounded-2xl border border-black/5 bg-white text-[#0b1220] p-4 text-left hover:shadow-lg transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-10 h-10 grid place-items-center rounded-xl ${
                      TAB_COLORS[t.k] || "bg-indigo-500"
                    }`}
                  >
                    {iconFor(t.k)}
                  </span>
                  <div>
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-xs text-gray-500">
                      {subtitleFor(t.k)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function iconFor(k) {
  const cls = "w-6 h-6 text-white";
  switch (k) {
    case "Dashboard":
      return <LayoutDashboard className={cls} />;
    case "Add":
      return <PlusCircle className={cls} />;
    case "Expenses":
      return <ListChecks className={cls} />;
    case "Recurring":
      return <RefreshCw className={cls} />;
    case "Settings":
      return <SettingsIcon className={cls} />;
    default:
      return <LayoutDashboard className={cls} />;
  }
}

function subtitleFor(k) {
  switch (k) {
    case "Dashboard":
      return "ภาพรวม + KPI ของงบประมาณ";
    case "Add":
      return "เพิ่มรายการใช้จ่ายใหม่อย่างรวดเร็ว";
    case "Expenses":
      return "ค้นหา/สรุปรายการ + Export CSV";
    case "Recurring":
      return "ตั้งค่ารายการประจำ (เช่น ค่าเน็ต/ผ่อน)";
    case "Settings":
      return "ภาษา, รอบตัดงบ, หมวดหมู่ & สำรองข้อมูล";
    default:
      return "";
  }
}

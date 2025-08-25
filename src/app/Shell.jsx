// src/app/Shell.jsx
import React from "react";
import ErrorBoundary from "./ErrorBoundary";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";

// สีประจำเมนู
const TAB_COLORS = {
  Dashboard: "bg-indigo-500",
  Add: "bg-emerald-500",
  Expenses: "bg-sky-500",
  Recurring: "bg-violet-500",
  Settings: "bg-amber-500",
};

export default function Shell({
  title,
  tabs,
  active,
  onSelect,
  onBackHome,
  children,
}) {
  return (
    <div className="min-h-screen text-white bg-[#0d1b2a] flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-[#0b2545]">
        <div className="h-14 px-4 flex items-center gap-3 border-b border-white/10">
          {/* ใช้โลโก้จริง */}
          <img
            src="/logo-mark.png"
            alt="Logo"
            className="w-12 h-12 rounded-xl object-contain"
          />
          <div className="font-bold text-lg line-clamp-1">Expense Tracker</div>
        </div>

        <nav className="p-3 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => onSelect(t.k)}
              className={`w-full text-left px-3 py-2 rounded-xl transition touch-manipulation flex items-center gap-3
              ${active === t.k ? "bg-white/10" : "hover:bg-white/5"}`}
            >
              {/* badge สีสำหรับไอคอน */}
              <span
                className={`w-9 h-9 grid place-items-center rounded-xl ${
                  TAB_COLORS[t.k] || "bg-white/10"
                }`}
              >
                {iconFor(t.k)}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3 text-xs text-white/60">v2 • React</div>
      </aside>

      {/* Content column */}
      <div className="flex-1 flex flex-col w-full">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 w-full border-b border-white/10 safe-top bg-[#0b2545]/90 backdrop-blur">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo-mark.png"
                alt="Logo"
                className="w-9 h-9 rounded-xl object-contain"
              />
              <div className="font-semibold text-sm">{title}</div>
            </div>

            {/* Dropdown พร้อม Home */}
            <select
              value={active}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__home") {
                  onBackHome?.();
                  setTimeout(() => onSelect(tabs[0]?.k || "Dashboard"), 0);
                } else onSelect(v);
              }}
              className="border border-white/20 bg-[#0b2545] text-white rounded-xl px-2 py-1 text-sm"
            >
              <option value="__home">🏠 Home</option>
              {tabs.map((t) => (
                <option key={t.k} value={t.k}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 pt-4 pb-24 safe-bottom text-[#0b1220]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

// ไอคอนหลัก (สีเป็นสีของ badge)
function iconFor(k) {
  const cls = "w-5 h-5 text-white";
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

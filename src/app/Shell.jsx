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

// สี badge (desktop sidebar)
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
        <button
          type="button"
          onClick={() => onBackHome?.()}
          className="h-16 px-4 flex items-center gap-3 border-b border-white/10 text-left hover:bg-white/5"
        >
          <img
            src="/logo-mark.png"
            alt="Logo"
            className="w-12 h-12 rounded-xl object-contain"
          />
          <div className="font-bold text-lg line-clamp-1">{title}</div>
        </button>

        <nav className="p-3 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => onSelect(t.k)}
              className={`w-full text-left px-3 py-2 rounded-xl transition touch-manipulation flex items-center gap-3 ${
                active === t.k ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span
                className={`w-9 h-9 grid place-items-center rounded-xl ${
                  TAB_COLORS[t.k] || "bg-white/10"
                }`}
              >
                {iconFor(t.k, "w-5 h-5 text-white")}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3 text-xs text-white/60">v2 • React</div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header (mobile) */}
        <header className="md:hidden sticky top-0 z-30 w-full border-b border-white/10 safe-top bg-[#0b2545]/90 backdrop-blur">
          <button
            type="button"
            onClick={() => onBackHome?.()}
            className="px-4 h-16 w-full flex items-center gap-3 text-left active:opacity-90"
          >
            <img
              src="/logo-mark.png"
              alt="Logo"
              className="w-12 h-12 rounded-xl object-contain"
            />
            <div className="font-bold text-lg">{title}</div>
          </button>
        </header>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 pt-4 app-content text-[#0b1220]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>

        {/* Bottom Navigation (mobile) */}
        <BottomNav active={active} onSelect={onSelect} />
      </div>
    </div>
  );
}

function iconFor(k, cls = "w-6 h-6") {
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

// Bottom nav — ปุ่มกลางยกสูง + ปุ่มซ้าย/ขวาเป็นวงกลมสีประจำเมนู
function BottomNav({ active, onSelect }) {
  return (
    <div className="md:hidden bottom-nav fixed left-0 right-0 bottom-0 z-40">
      {/* ปุ่มกลาง (FAB = Dashboard) */}
      <button
        onClick={() => onSelect("Dashboard")}
        className={`fab absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full shadow-lg grid place-items-center ${
          active === "Dashboard"
            ? "bg-indigo-600 text-white"
            : "bg-indigo-500 text-white"
        }`}
        aria-label="Dashboard"
      >
        {iconFor("Dashboard", "w-7 h-7")}
      </button>

      {/* แถวไอคอนซ้าย-ขวา */}
      <div className="flex items-center justify-between px-6 h-16">
        {/* ซ้าย */}
        <button
          onClick={() => onSelect("Add")}
          className={`nav-btn rounded-full ${
            active === "Add" ? "bg-emerald-600" : "bg-emerald-500"
          } text-white`}
          aria-label="Add"
        >
          {iconFor("Add")}
        </button>
        <button
          onClick={() => onSelect("Expenses")}
          className={`nav-btn rounded-full ${
            active === "Expenses" ? "bg-sky-600" : "bg-sky-500"
          } text-white`}
          aria-label="Expenses"
        >
          {iconFor("Expenses")}
        </button>

        {/* เว้นพื้นที่สำหรับปุ่มกลาง */}
        <div className="w-16" aria-hidden />

        {/* ขวา */}
        <button
          onClick={() => onSelect("Recurring")}
          className={`nav-btn rounded-full ${
            active === "Recurring" ? "bg-violet-600" : "bg-violet-500"
          } text-white`}
          aria-label="Recurring"
        >
          {iconFor("Recurring")}
        </button>
        <button
          onClick={() => onSelect("Settings")}
          className={`nav-btn rounded-full ${
            active === "Settings" ? "bg-amber-600" : "bg-amber-500"
          } text-white`}
          aria-label="Settings"
        >
          {iconFor("Settings")}
        </button>
      </div>
    </div>
  );
}

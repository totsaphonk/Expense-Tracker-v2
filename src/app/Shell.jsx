// src/app/Shell.jsx
import React from "react";

export default function Shell({ title, tabs, active, onSelect, children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white">
        <div className="h-14 px-4 flex items-center gap-3 border-b">
          <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-semibold">
            ฿
          </div>
          <div className="font-semibold text-sm line-clamp-1">{title}</div>
        </div>
        <nav className="p-3 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => onSelect(t.k)}
              className={`w-full text-left px-3 py-2 rounded-xl transition ${
                active === t.k
                  ? "bg-black text-white"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              <span className="mr-2">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-3 text-xs text-gray-400">
          v2 • Built with React
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 w-full bg-white/80 backdrop-blur border-b safe-top">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-semibold">
              ฿
            </div>
            <div className="font-semibold text-sm">{title}</div>
          </div>
          {/* เมนูเป็น dropdown แบบง่าย ๆ บนมือถือ */}
          <select
            value={active}
            onChange={(e) => onSelect(e.target.value)}
            className="border rounded-xl px-2 py-1 text-sm"
          >
            {tabs.map((t) => (
              <option key={t.k} value={t.k}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 py-4">{children}</div>
      </main>
    </div>
  );
}

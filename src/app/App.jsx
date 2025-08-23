// src/app/App.jsx
import React, { useState } from "react";
import { AppProvider } from "../data/app-state";
import Dashboard from "../features/Dashboard";
import AddExpense from "../features/AddExpense";
import Expenses from "../features/Expenses";
import Reports from "../features/Reports";
import Settings from "../features/Settings";
import Recurring from "../features/Recurring";

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const TABS = [
    { k: "dashboard", label: "แดชบอร์ด" },
    { k: "add", label: "เพิ่มรายการ" },
    { k: "expenses", label: "รายการใช้จ่าย" },
    { k: "recurring", label: "รายการประจำ" },
    { k: "reports", label: "รายงาน" },
    { k: "settings", label: "ตั้งค่า" },
  ];

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-semibold">
                ฿
              </div>
              <h1 className="text-lg font-bold">
                ตัวช่วยบันทึกค่าใช้จ่ายรายเดือน — v2
              </h1>
            </div>
          </div>
        </header>

        <nav className="max-w-5xl mx-auto px-4 pt-3">
          <div className="grid grid-cols-6 gap-2">
            {TABS.map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                aria-selected={tab === t.k}
                className={`px-3 py-2 rounded-2xl border ${
                  tab === t.k ? "bg-black text-white" : "bg-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 pb-24">
          {tab === "dashboard" && <Dashboard />}
          {tab === "add" && <AddExpense />}
          {tab === "expenses" && <Expenses />}
          {tab === "recurring" && <Recurring />}
          {tab === "reports" && <Reports />}
          {tab === "settings" && <Settings />}
        </main>
      </div>
    </AppProvider>
  );
}

// src/app/App.jsx
import React, { useState } from "react";
import { AppProvider, useApp } from "../data/app-state";

import Dashboard from "../features/Dashboard";
import AddExpense from "../features/AddExpense";
import Expenses from "../features/Expenses";
import Reports from "../features/Reports";
import Settings from "../features/Settings";
import Recurring from "../features/Recurring";

import Landing from "./Landing";
import Shell from "./Shell";
import { useI18n } from "../i18n";

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

function AppInner() {
  // stage: 'landing' | tab keys
  const [stage, setStage] = useState("landing");
  const [tab, setTab] = useState("dashboard");
  const t = useI18n();

  const TABS = [
    { k: "dashboard", label: t("menu.dashboard"), icon: "📊" },
    { k: "add", label: t("menu.add"), icon: "➕" },
    { k: "expenses", label: t("menu.expenses"), icon: "📑" },
    { k: "recurring", label: t("menu.recurring"), icon: "🔄" },
    { k: "reports", label: t("menu.reports"), icon: "📈" },
    { k: "settings", label: t("menu.settings"), icon: "⚙" },
  ];

  if (stage === "landing") {
    return (
      <Landing
        tabs={TABS}
        onPick={(k) => {
          setTab(k);
          setStage("app");
        }}
        title={t("app.title")}
      />
    );
  }

  return (
    <Shell title={t("app.title")} tabs={TABS} active={tab} onSelect={setTab}>
      {tab === "dashboard" && <Dashboard />}
      {tab === "add" && <AddExpense />}
      {tab === "expenses" && <Expenses />}
      {tab === "recurring" && <Recurring />}
      {tab === "reports" && <Reports />}
      {tab === "settings" && <Settings />}
    </Shell>
  );
}

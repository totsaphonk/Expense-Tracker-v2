// src/app/App.jsx
import React, { useState } from "react";
import { AppProvider } from "../data/app-state";

import Dashboard from "../features/Dashboard";
import AddExpense from "../features/AddExpense";
import Expenses from "../features/Expenses";
import Recurring from "../features/Recurring";
import Settings from "../features/Settings";
import Landing from "./Landing";
import Shell from "./Shell";
import { useI18n } from "../i18n";

// ✅ ไอคอน modern จาก lucide-react
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";

// ✅ กำหนดชื่อโปรแกรมตรงนี้ครั้งเดียว
const APP_TITLE = "Expense Tracker";

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

function AppInner() {
  // stage: 'landing' | 'app'
  const [stage, setStage] = useState("landing");
  // แท็บ (พิมพ์ใหญ่ตามที่คุณตั้ง)
  const [tab, setTab] = useState("Dashboard");
  const t = useI18n();

  const TABS = [
    {
      k: "Dashboard",
      label: t("menu_dashboard"),
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      k: "Add",
      label: t("menu_add"),
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      k: "Expenses",
      label: t("menu_expenses"),
      icon: <ListChecks className="w-5 h-5" />,
    },
    {
      k: "Recurring",
      label: t("menu_recurring"),
      icon: <RefreshCw className="w-5 h-5" />,
    },
    {
      k: "Settings",
      label: t("menu_settings"),
      icon: <SettingsIcon className="w-5 h-5" />,
    },
  ];

  if (stage === "landing") {
    return (
      <Landing
        tabs={TABS}
        title={APP_TITLE}
        onPick={(k) => {
          setTab(k);
          setStage("app");
        }}
      />
    );
  }

  return (
    <Shell
      title={APP_TITLE}
      tabs={TABS}
      active={tab}
      onSelect={setTab}
      onBackHome={() => setStage("landing")}
    >
      {tab === "Dashboard" && <Dashboard />}
      {tab === "Add" && <AddExpense />}
      {tab === "Expenses" && <Expenses />}
      {tab === "Recurring" && <Recurring />}
      {tab === "Settings" && <Settings />}
    </Shell>
  );
}

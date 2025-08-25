// src/data/app-state.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getEngine, uid, getCycleRange } from "./engine";

const DEFAULT_SETTINGS = {
  cycleStartDay: 1,
  currency: "THB",
  locale: "th-TH",
  rollover: false,
};

const AppState = createContext(null);
export function useApp() {
  return useContext(AppState);
}

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState([]); // ← ไม่มีค่าเริ่มต้น
  const [expenses, setExpenses] = useState([]); // ← ว่าง
  const [recurrings, setRecurrings] = useState([]); // ← ว่าง

  useEffect(() => {
    (async () => {
      const eng = await getEngine();
      await eng.migrateFromLocalIfNeeded?.();

      let s = await eng.loadSettings();
      let c = await eng.loadCategories();
      let e = await eng.loadExpenses();
      let r = await (eng.loadRecurrings?.() || []);

      if (!s) {
        s = DEFAULT_SETTINGS;
        await eng.saveSettings(s);
      }
      // ❌ ไม่ seed หมวด/งบอีกต่อไป
      if (!Array.isArray(c)) c = [];
      if (!Array.isArray(e)) e = [];
      if (!Array.isArray(r)) r = [];

      setSettings(s);
      setCategories(c);
      setExpenses(e);
      setRecurrings(r);
      setReady(true);
    })();
  }, []);

  // รองรับ Restore (จาก Settings)
  useEffect(() => {
    function onRestore(ev) {
      const d = ev.detail || {};
      if (Array.isArray(d.expenses)) setExpenses(d.expenses);
      if (Array.isArray(d.recurrings)) setRecurrings(d.recurrings);
    }
    window.addEventListener("et-restore", onRestore);
    return () => window.removeEventListener("et-restore", onRestore);
  }, []);

  // persist
  useEffect(() => {
    (async () => {
      if (!ready) return;
      const eng = await getEngine();
      await eng.saveSettings(settings);
    })();
  }, [settings, ready]);
  useEffect(() => {
    (async () => {
      if (!ready) return;
      const eng = await getEngine();
      await eng.saveCategories(categories);
    })();
  }, [categories, ready]);
  useEffect(() => {
    (async () => {
      if (!ready) return;
      const eng = await getEngine();
      await eng.saveExpenses(expenses);
    })();
  }, [expenses, ready]);
  useEffect(() => {
    (async () => {
      if (!ready) return;
      const eng = await getEngine();
      if (eng.saveRecurrings) await eng.saveRecurrings(recurrings);
    })();
  }, [recurrings, ready]);

  const value = useMemo(
    () => ({
      ready,
      settings,
      setSettings,
      categories,
      setCategories,
      expenses,
      setExpenses,
      recurrings,
      setRecurrings,
      getCycleRange,
      uid,
    }),
    [ready, settings, categories, expenses, recurrings]
  );

  return <AppState.Provider value={value}>{children}</AppState.Provider>;
}

// src/data/app-state.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getEngine, uid, getCycleRange } from "./engine";

const DEFAULT_SETTINGS = { cycleStartDay: 1, currency: "THB", locale: "th-TH", rollover: false };
const DEFAULT_CATEGORIES = [
  { id: uid(), name: "อาหาร/ขนม/บันเทิง", budget: 10000 },
  { id: uid(), name: "ของใช้จำเป็น/ซูเปอร์", budget: 5000 },
  { id: uid(), name: "น้ำมัน", budget: 6000 },
  { id: uid(), name: "ผ่อนรายเดือน", budget: 10000 },
  { id: uid(), name: "ค่าน้ำ/ค่าไฟ", budget: 4000 },
];

const AppState = createContext(null);
export function useApp() { return useContext(AppState); }

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recurrings, setRecurrings] = useState([]);

  // Boot: load from engine (LS for now), seed defaults if needed
  useEffect(() => {
    (async () => {
      const eng = await getEngine();
      await eng.migrateFromLocalIfNeeded?.();
      let s = await eng.loadSettings();
      let c = await eng.loadCategories();
      let e = await eng.loadExpenses();
      let r = await (eng.loadRecurrings?.() || []);
      if (!s) { s = DEFAULT_SETTINGS; await eng.saveSettings(s); }
      if (!c || c.length === 0) { c = DEFAULT_CATEGORIES; await eng.saveCategories(c); }
      setSettings(s);
      setCategories(c);
      setExpenses(e);
      setRecurrings(r);
      setReady(true);
    })();
  }, []);

  // Backup restore listener (Settings.jsx emits "et-restore")
  useEffect(() => {
    function onRestore(ev) {
      const d = ev.detail || {};
      if (Array.isArray(d.expenses)) setExpenses(d.expenses);
      if (Array.isArray(d.recurrings)) setRecurrings(d.recurrings);
    }
    window.addEventListener("et-restore", onRestore);
    return () => window.removeEventListener("et-restore", onRestore);
  }, []);

  // Persist
  useEffect(() => { (async () => { if (!ready) return; (await getEngine()).saveSettings(settings); })(); }, [settings, ready]);
  useEffect(() => { (async () => { if (!ready) return; (await getEngine()).saveCategories(categories); })(); }, [categories, ready]);
  useEffect(() => { (async () => { if (!ready) return; (await getEngine()).saveExpenses(expenses); })(); }, [expenses, ready]);
  useEffect(() => { (async () => { if (!ready) return; const eng = await getEngine(); if (eng.saveRecurrings) await eng.saveRecurrings(recurrings); })(); }, [recurrings, ready]);

  // OPTIONAL: auto-apply due recurring items once at startup
  useEffect(() => {
    if (!ready) return;

    const todayISO = new Date().toISOString().slice(0, 10);
    const addMonthsKeepDay = (dateISO, n) => {
      const d = new Date(dateISO);
      const day = d.getDate();
      d.setMonth(d.getMonth() + n);
      if (d.getDate() !== day) d.setDate(0);
      return d.toISOString().slice(0, 10);
    };
    const nextDueISO = (r) => (!r.lastAppliedISO ? r.startISO : addMonthsKeepDay(r.lastAppliedISO, Number(r.everyMonths || 1)));
    const withinLimits = (r, occCountFromStart, candidateISO) => {
      if (r.occurrences != null && r.occurrences !== "" && !Number.isNaN(Number(r.occurrences))) {
        if (occCountFromStart >= Number(r.occurrences)) return false;
      }
      if (r.untilISO && new Date(candidateISO) > new Date(r.untilISO)) return false;
      return true;
    };

    let applied = 0;
    const newExpenses = [...expenses];
    const newRecurrings = [...recurrings];

    newRecurrings.forEach((r, idx) => {
      for (let i = 0; i < 36; i++) {
        const nISO = nextDueISO(r);
        const s = new Date(r.startISO);
        const n = new Date(nISO);
        let occIdx = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
        occIdx = Math.floor(occIdx / Number(r.everyMonths || 1));
        if (occIdx < 0) occIdx = 0;

        if (new Date(nISO) <= new Date(todayISO) && withinLimits(r, occIdx + (r.lastAppliedISO ? 1 : 0), nISO)) {
          newExpenses.unshift({
            id: uid(),
            dateISO: nISO,
            categoryId: r.categoryId,
            amount: Number(r.amount) || 0,
            note: r.note ? `[ประจำ] ${r.note}` : `[ประจำ]`,
          });
          newRecurrings[idx] = { ...r, lastAppliedISO: nISO };
          r = newRecurrings[idx];
          applied++;
        } else {
          break;
        }
      }
    });

    if (applied > 0) {
      setExpenses(newExpenses);
      setRecurrings(newRecurrings);
    }
    // run only once when ready flips to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const value = useMemo(
    () => ({
      ready,
      settings, setSettings,
      categories, setCategories,
      expenses, setExpenses,
      recurrings, setRecurrings,
      getCycleRange,
      uid,
    }),
    [ready, settings, categories, expenses, recurrings]
  );

  return <AppState.Provider value={value}>{children}</AppState.Provider>;
}

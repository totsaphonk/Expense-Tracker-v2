// src/features/Recurring.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../data/app-state";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

// Utility to keep day-of-month when adding months (already similar to engine.addMonths)
function addMonthsKeepDay(dateISO, n) {
  const d = new Date(dateISO);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function nextDueISO(r) {
  // Next date to apply after lastAppliedISO (or from startISO if none)
  if (!r.lastAppliedISO) return r.startISO;
  return addMonthsKeepDay(r.lastAppliedISO, Number(r.everyMonths || 1));
}

function withinLimits(r, occCountFromStart, candidateISO) {
  // occurrences limit
  if (r.occurrences != null && r.occurrences !== "" && !Number.isNaN(Number(r.occurrences))) {
    if (occCountFromStart >= Number(r.occurrences)) return false;
  }
  // untilISO limit
  if (r.untilISO) {
    if (new Date(candidateISO) > new Date(r.untilISO)) return false;
  }
  return true;
}

export default function Recurring() {
  const {
    ready, categories,
    expenses, setExpenses,
    recurrings, setRecurrings,
    uid,
  } = useApp();

  const [form, setForm] = useState({
    categoryId: "",
    amount: "",
    note: "",
    startISO: new Date().toISOString().slice(0, 10),
    everyMonths: 1,
    occurrences: "",
    untilISO: "",
  });

  const byId = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  function addRecurring(e) {
    e.preventDefault();
    if (!form.categoryId || !form.startISO || Number(form.everyMonths) <= 0 || Number(form.amount) <= 0) return;
    const item = {
      id: uid(),
      categoryId: form.categoryId,
      amount: Number(form.amount),
      note: form.note?.trim() || "",
      startISO: form.startISO,
      everyMonths: Number(form.everyMonths) || 1,
      occurrences: form.occurrences === "" ? null : Number(form.occurrences),
      untilISO: form.untilISO || null,
      lastAppliedISO: null,
    };
    setRecurrings(prev => [item, ...prev]);
    setForm({
      categoryId: categories[0]?.id || "",
      amount: "",
      note: "",
      startISO: new Date().toISOString().slice(0, 10),
      everyMonths: 1,
      occurrences: "",
      untilISO: "",
    });
  }

  function deleteRecurring(id) {
    if (!confirm("ลบรายการประจำนี้ใช่ไหม?")) return;
    setRecurrings(prev => prev.filter(r => r.id !== id));
  }

  function applyOne(r) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const start = r.startISO;
    let nextISO = nextDueISO(r);

    // Count how many occurrences since start we *intend* to apply.
    let occIdx = 0;
    // Calculate occIdx based on difference between nextISO and startISO
    {
      const s = new Date(start);
      const n = new Date(nextISO);
      occIdx = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
      occIdx = Math.floor(occIdx / Number(r.everyMonths || 1));
      if (occIdx < 0) occIdx = 0;
    }

    // Only apply if due (<= today) and within limits
    if (new Date(nextISO) <= new Date(todayISO) && withinLimits(r, occIdx + (r.lastAppliedISO ? 1 : 0), nextISO)) {
      const note = r.note ? `[ประจำ] ${r.note}` : `[ประจำ]`;
      const expense = {
        id: uid(),
        dateISO: nextISO,
        categoryId: r.categoryId,
        amount: Number(r.amount) || 0,
        note,
      };
      setExpenses(prev => [expense, ...prev]);
      setRecurrings(prev => prev.map(x => x.id === r.id ? { ...x, lastAppliedISO: nextISO } : x));
      return true;
    }
    return false;
  }

  function applyAllDue() {
    let applied = 0;
    recurrings.forEach(r => {
      // Safety loop: apply repeatedly if a template is multiple cycles behind
      // but clamp to avoid infinite loops (e.g., max 36 applies at once).
      for (let i = 0; i < 36; i++) {
        const before = applied;
        const ok = applyOne(r);
        if (ok) applied++;
        if (!ok) break;
      }
    });
    alert(applied > 0 ? `สร้างรายการใช้จ่ายจากรายการประจำแล้ว ${applied} รายการ` : "ไม่มีรายการประจำที่ถึงกำหนด");
  }

  const rows = useMemo(() => {
    return recurrings.map(r => {
      const cat = byId[r.categoryId];
      const nextISO = nextDueISO(r);
      const due = new Date(nextISO) <= new Date();
      return {
        ...r,
        _catName: cat?.name || "(หมวดถูกลบ)",
        _nextISO: nextISO,
        _isDue: due,
      };
    });
  }, [recurrings, byId]);

  if (!ready) return null;

  return (
    <section className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <h3 className="font-semibold mb-3">เพิ่มรายการประจำ</h3>
        <form onSubmit={addRecurring} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs">หมวดหมู่</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full border rounded-xl px-3 py-2"
            >
              <option value="">— เลือก —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs">จำนวนเงิน (บาท)</label>
            <input type="number" inputMode="decimal" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs">เริ่มตั้งแต่</label>
            <input type="date" value={form.startISO} onChange={(e)=>setForm({...form, startISO: e.target.value})} className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs">ทุก ๆ (เดือน)</label>
            <input type="number" min={1} value={form.everyMonths} onChange={(e)=>setForm({...form, everyMonths: e.target.value})} className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs">จำนวนครั้ง (ไม่บังคับ)</label>
            <input type="number" min={1} value={form.occurrences} onChange={(e)=>setForm({...form, occurrences: e.target.value})} className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs">จนถึง (ไม่บังคับ)</label>
            <input type="date" value={form.untilISO} onChange={(e)=>setForm({...form, untilISO: e.target.value})} className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div className="md:col-span-6">
            <label className="text-xs">หมายเหตุ</label>
            <input type="text" value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} placeholder="เช่น ผ่อนโทรศัพท์ งวด 1/10" className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div className="md:col-span-6">
            <button type="submit" className="px-4 py-2 bg-black text-white rounded-2xl">บันทึก</button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold mb-3">รายการประจำทั้งหมด</h3>
          <button onClick={applyAllDue} className="px-3 py-2 border rounded-2xl">Apply รายการที่ถึงกำหนด</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {rows.length === 0 && <div className="text-sm text-gray-500">ยังไม่มีรายการประจำ</div>}
          {rows.map(r => (
            <div key={r.id} className="rounded-xl border p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <div className="text-sm md:col-span-2">
                <div className="font-medium">{r._catName}</div>
                {r.note && <div className="text-xs text-gray-500 mt-0.5">{r.note}</div>}
              </div>
              <div className="text-sm">
                <div className="text-gray-500 text-xs">จำนวนเงิน</div>
                <div className="font-semibold">{thb.format(r.amount)}</div>
              </div>
              <div className="text-sm">
                <div className="text-gray-500 text-xs">เริ่ม</div>
                <div>{new Date(r.startISO).toLocaleDateString("th-TH")}</div>
              </div>
              <div className="text-sm">
                <div className="text-gray-500 text-xs">รอบ</div>
                <div>ทุก {r.everyMonths} เดือน</div>
              </div>
              <div className="text-sm">
                <div className="text-gray-500 text-xs">ครั้งถัดไป</div>
                <div className={r._isDue ? "text-red-600 font-medium" : ""}>
                  {new Date(r._nextISO).toLocaleDateString("th-TH")}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => applyOne(r)} className="px-3 py-2 border rounded-xl">Apply</button>
                <button onClick={() => deleteRecurring(r.id)} className="px-3 py-2 border rounded-xl">ลบ</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

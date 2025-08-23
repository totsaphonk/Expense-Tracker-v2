// src/features/Settings.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../data/app-state";

export default function Settings() {
  const {
    ready,
    settings, setSettings,
    categories, setCategories,
    expenses, recurrings,
  } = useApp();

  const [localSettings, setLocalSettings] = useState(() => ({
    cycleStartDay: settings?.cycleStartDay ?? 1,
  }));
  const [cats, setCats] = useState(() =>
    (categories ?? []).map((c) => ({ ...c }))
  );

  if (!ready) return <div className="p-6 text-gray-500">กำลังโหลด…</div>;

  function saveAll(e) {
    e.preventDefault();
    const day = Math.min(28, Math.max(1, Number(localSettings.cycleStartDay || 1)));
    setSettings((s) => ({ ...s, cycleStartDay: day }));
    // normalize budgets to number
    setCategories(cats.map((c) => ({ ...c, budget: Number(c.budget || 0) })));
  }

  function addCategory() {
    const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    setCats((prev) => [...prev, { id, name: "หมวดใหม่", budget: 0, color: "" }]);
  }
  function removeCategory(id) {
    setCats((prev) => prev.filter((c) => c.id !== id));
  }

  // Backup JSON
  const backupJson = useMemo(() => {
    return JSON.stringify(
      { settings, categories, expenses, recurrings },
      null,
      2
    );
  }, [settings, categories, expenses, recurrings]);

  function downloadBackup() {
    const blob = new Blob([backupJson], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expense_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleRestore(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.settings) setSettings(data.settings);
        if (Array.isArray(data.categories)) setCategories(data.categories);
        // optional: also restore expenses & recurrings
        // We will ask you before overwriting expenses to avoid accidental loss
        if (Array.isArray(data.expenses) || Array.isArray(data.recurrings)) {
          if (confirm("ต้องการแทนที่รายการใช้จ่าย/รายการประจำทั้งหมดจากไฟล์นี้หรือไม่?")) {
            // we have setters for expenses/recurrings exposed via useApp
            // but not listed in destructuring at top; we can set via a callback
            // easiest approach: custom event for simplicity
            window.dispatchEvent(
              new CustomEvent("et-restore", { detail: data })
            );
          }
        }
        alert("กู้คืนการตั้งค่า/หมวดสำเร็จ");
      } catch (err) {
        alert("ไฟล์ไม่ถูกต้อง");
      }
    };
    reader.readAsText(file);
  }

  return (
    <section className="mt-4 space-y-4">
      <form onSubmit={saveAll} className="rounded-2xl border bg-white p-4 space-y-4">
        <h3 className="font-semibold">ตั้งค่า</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs">วันที่เริ่มรอบตัดงบ (1–28)</label>
            <input
              type="number"
              min={1}
              max={28}
              value={localSettings.cycleStartDay}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, cycleStartDay: e.target.value }))
              }
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <h3 className="font-semibold mt-3">หมวดหมู่ & งบประมาณ</h3>
        <div className="grid grid-cols-1 gap-2">
          {cats.map((c) => (
            <div key={c.id} className="rounded-xl border p-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <input
                value={c.name}
                onChange={(e) =>
                  setCats((prev) =>
                    prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x))
                  )
                }
                className="border rounded-xl px-3 py-2"
                placeholder="ชื่อหมวด"
              />
              <input
                type="number"
                value={c.budget}
                onChange={(e) =>
                  setCats((prev) =>
                    prev.map((x) => (x.id === c.id ? { ...x, budget: e.target.value } : x))
                  )
                }
                className="border rounded-xl px-3 py-2"
                placeholder="งบ (บาท)"
              />
              <input
                value={c.color || ""}
                onChange={(e) =>
                  setCats((prev) =>
                    prev.map((x) => (x.id === c.id ? { ...x, color: e.target.value } : x))
                  )
                }
                className="border rounded-xl px-3 py-2"
                placeholder="#RRGGBB (ถ้ามี)"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeCategory(c.id)}
                  className="px-3 py-2 border rounded-xl"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={addCategory} className="px-4 py-2 border rounded-2xl">
            + เพิ่มหมวด
          </button>
          <button type="submit" className="px-4 py-2 bg-black text-white rounded-2xl">
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </form>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <h3 className="font-semibold">สำรองข้อมูล / กู้คืน</h3>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadBackup} className="px-4 py-2 border rounded-2xl">
            ดาวน์โหลดไฟล์ Backup (.json)
          </button>
          <label className="px-4 py-2 border rounded-2xl cursor-pointer">
            เลือกไฟล์กู้คืน (.json)
            <input type="file" accept="application/json" onChange={handleRestore} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          * Backup จะบันทึก settings, categories, expenses, และ recurring ทั้งหมด
        </p>
      </div>
    </section>
  );
}

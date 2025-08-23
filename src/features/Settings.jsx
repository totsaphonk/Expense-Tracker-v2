// src/features/Settings.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../data/app-state";

const LANGS = [
  { value: "th-TH", label: "ไทย" },
  { value: "en-US", label: "English" },
];

// helpers for money input
const onlyDigitsAndDot = (s) => s.replace(/[^\d.]/g, "");
const toNumber = (s) => {
  if (s === "" || s == null) return NaN;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const formatMoney = (n) =>
  Number.isFinite(n) ? n.toLocaleString("en-US") : "";

export default function Settings() {
  const {
    ready,
    settings,
    setSettings,
    categories,
    setCategories,
    expenses,
    recurrings,
  } = useApp();

  const [local, setLocal] = useState(() => ({
    cycleStartDay: settings?.cycleStartDay ?? 1,
    locale: settings?.locale ?? "th-TH",
  }));

  // keep raw inputs for budget with formatted commas
  const [cats, setCats] = useState(() =>
    (categories ?? []).map((c) => ({
      ...c,
      _budgetInput:
        c.budget === "" || c.budget == null
          ? ""
          : formatMoney(Number(c.budget)),
    }))
  );

  if (!ready) return <div className="p-6 text-gray-500">กำลังโหลด…</div>;
  const t = (th, en) =>
    (local.locale || settings?.locale) === "en-US" ? en : th;

  // ---- actions ----
  function addCategory() {
    const id = `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    setCats((prev) => [
      ...prev,
      {
        id,
        name: t("หมวดใหม่", "New Category"),
        budget: "",
        _budgetInput: "",
        color: "#000000",
      },
    ]);
  }

  function removeCategory(id) {
    if (!confirm(t("ลบหมวดนี้ใช่ไหม?", "Delete this category?"))) return;
    setCats((prev) => prev.filter((c) => c.id !== id));
  }

  // validate & save
  function saveAll(e) {
    e.preventDefault();

    // 1) day 1–31
    const day = Math.min(31, Math.max(1, Number(local.cycleStartDay || 1)));

    // 2) normalize + validate categories
    // - required: name not empty
    // - required: budget is a number >= 0
    // - no duplicate names (trim/case-insensitive)
    const normalized = [];
    const nameSet = new Set();
    for (const c of cats) {
      const name = (c.name || "").trim();
      const budget = toNumber(c._budgetInput ?? c.budget);

      if (!name) {
        alert(t("กรุณากรอกชื่อหมวดให้ครบ", "Please fill category name"));
        return;
      }
      if (!Number.isFinite(budget) || budget < 0) {
        alert(
          t(
            "กรุณากรอกงบเป็นตัวเลขที่ถูกต้อง",
            "Please enter a valid budget amount"
          )
        );
        return;
      }
      const key = name.toLowerCase();
      if (nameSet.has(key)) {
        alert(
          t(`มีหมวด "${name}" อยู่แล้ว`, `Category "${name}" already exists`)
        );
        return;
      }
      nameSet.add(key);

      normalized.push({
        id: c.id,
        name,
        budget: Number(budget),
        color: c.color || "#000000",
      });
    }

    // 3) save settings & categories
    setSettings((s) => ({
      ...s,
      cycleStartDay: day,
      locale: local.locale || s.locale || "th-TH",
    }));
    setCategories(normalized);

    alert(t("บันทึกการตั้งค่าเรียบร้อยแล้ว", "Settings saved successfully"));
  }

  // ---- render ----
  return (
    <section className="mt-4 space-y-4">
      <form
        onSubmit={saveAll}
        className="rounded-2xl border bg-white p-4 space-y-4"
      >
        <h3 className="font-semibold">{t("ตั้งค่า", "Settings")}</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs">
              {t("ภาษา (Language)", "Language")}
            </label>
            <select
              value={local.locale}
              onChange={(e) =>
                setLocal((s) => ({ ...s, locale: e.target.value }))
              }
              className="w-full border rounded-xl px-3 py-2"
            >
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs">
              {t("วันเริ่มรอบตัดงบ (1–31)", "Cycle start day (1–31)")}
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={local.cycleStartDay}
              onChange={(e) =>
                setLocal((s) => ({ ...s, cycleStartDay: e.target.value }))
              }
              className="w-full border rounded-xl px-3 py-2"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              {t(
                "หากเลือก 30/31 เดือนที่วันไม่ถึง ระบบจะเลื่อนไปวันสุดท้ายของเดือนให้อัตโนมัติ",
                "If the month has fewer days, it will clamp to that month's last day automatically."
              )}
            </p>
          </div>
        </div>

        <h3 className="font-semibold mt-3">
          {t("หมวดหมู่ & งบประมาณ", "Categories & Budgets")}
        </h3>

        <div className="grid grid-cols-1 gap-2">
          {cats.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border p-3 flex items-center gap-3"
            >
              {/* name (flex-grow) */}
              <input
                value={c.name}
                onChange={(e) =>
                  setCats((prev) =>
                    prev.map((x) =>
                      x.id === c.id ? { ...x, name: e.target.value } : x
                    )
                  )
                }
                className="border rounded-xl px-3 py-2 flex-1 min-w-[180px]"
                placeholder={t("ชื่อหมวด", "Category name")}
              />

              {/* budget (fixed width, with commas) */}
              <input
                inputMode="decimal"
                value={c._budgetInput}
                onChange={(e) => {
                  const raw = onlyDigitsAndDot(e.target.value);
                  // format on the fly (commas). We avoid NaN like "."
                  const n = toNumber(raw);
                  setCats((prev) =>
                    prev.map((x) =>
                      x.id === c.id
                        ? {
                            ...x,
                            _budgetInput:
                              raw === ""
                                ? ""
                                : formatMoney(
                                    Number.isFinite(n)
                                      ? n
                                      : toNumber(raw.slice(0, -1))
                                  ),
                          }
                        : x
                    )
                  );
                }}
                onBlur={() => {
                  // final format
                  setCats((prev) =>
                    prev.map((x) => {
                      if (x.id !== c.id) return x;
                      const n = toNumber(x._budgetInput);
                      return {
                        ...x,
                        _budgetInput: Number.isFinite(n) ? formatMoney(n) : "",
                      };
                    })
                  );
                }}
                className="border rounded-xl px-3 py-2 w-32 md:w-40 text-right"
                placeholder={t("งบ (บาท)", "Budget")}
              />

              {/* color (picker only, small) */}
              <input
                type="color"
                value={c.color || "#000000"}
                onChange={(e) =>
                  setCats((prev) =>
                    prev.map((x) =>
                      x.id === c.id ? { ...x, color: e.target.value } : x
                    )
                  )
                }
                className="h-10 w-10 p-1 rounded"
                title={t("เลือกสีหมวดหมู่", "Pick category color")}
              />

              {/* delete (align right) */}
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={() => removeCategory(c.id)}
                  className="px-3 py-2 border rounded-xl"
                >
                  {t("ลบ", "Delete")}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addCategory}
            className="px-4 py-2 border rounded-2xl"
          >
            {t("+ เพิ่มหมวด", "+ Add Category")}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-2xl"
          >
            {t("บันทึกการเปลี่ยนแปลง", "Save changes")}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <h3 className="font-semibold">
          {t("สำรองข้อมูล / กู้คืน", "Backup / Restore")}
        </h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadBackup}
            className="px-4 py-2 border rounded-2xl"
          >
            {t("ดาวน์โหลดไฟล์ Backup (.json)", "Download Backup (.json)")}
          </button>
          <label className="px-4 py-2 border rounded-2xl cursor-pointer">
            {t("เลือกไฟล์กู้คืน (.json)", "Choose restore file (.json)")}
            <input
              type="file"
              accept="application/json"
              onChange={handleRestore}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          {t(
            "* Backup จะบันทึก settings, categories, expenses, และ recurring ทั้งหมด",
            "* Backup includes settings, categories, expenses, and recurrings"
          )}
        </p>
      </div>
    </section>
  );

  // ---- backup helpers (unchanged) ----
  function downloadBackup() {
    const backupJson = JSON.stringify(
      { settings, categories, expenses, recurrings },
      null,
      2
    );
    const blob = new Blob([backupJson], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expense_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
        if (Array.isArray(data.expenses) || Array.isArray(data.recurrings)) {
          if (
            confirm(
              t(
                "ต้องการแทนที่รายการใช้จ่าย/รายการประจำทั้งหมดจากไฟล์นี้หรือไม่?",
                "Replace all expenses/recurrings from this file?"
              )
            )
          ) {
            window.dispatchEvent(
              new CustomEvent("et-restore", { detail: data })
            );
          }
        }
        alert(t("กู้คืนข้อมูลแล้ว", "Restore completed"));
      } catch {
        alert(t("ไฟล์ไม่ถูกต้อง", "Invalid file"));
      }
    };
    reader.readAsText(file);
  }
}

// src/i18n.js
import { useApp } from "./data/app-state";

const STR = {
  th: {
    app_title: "ตัวช่วยบันทึกค่าใช้จ่ายรายเดือน — v2",
    menu_dashboard: "แดชบอร์ด",
    menu_add: "เพิ่มรายการ",
    menu_expenses: "รายการใช้จ่าย",
    menu_recurring: "รายการประจำ",
    menu_reports: "รายงาน",
    menu_settings: "ตั้งค่า",

    dash_starts: "เริ่มทุกวันที่ {{day}}",
    dash_budget: "งบรวม",
    dash_spent: "ใช้ไปแล้ว",
    dash_remain: "คงเหลือ",
    dash_pie: "สัดส่วนค่าใช้จ่าย (รอบนี้)",
    dash_bar: "ค่าใช้จ่ายรายวัน (แยกตามหมวด)",
    loading: "กำลังเตรียมข้อมูล…",

    add_title: "เพิ่มรายการใหม่",
    add_date: "วันที่",
    add_cat: "หมวดหมู่",
    add_amount: "จำนวนเงิน (บาท)",
    add_note: "หมายเหตุ (ถ้ามี)",
    add_save: "บันทึก",

    exp_title: "รายการใช้จ่าย (ตามตัวกรอง)",
    exp_search: "คำค้น (ในหมายเหตุ)",
    exp_from: "จากวันที่",
    exp_to: "ถึงวันที่",
    exp_cat: "หมวดหมู่",
    exp_all: "ทั้งหมด",
    exp_amt_ge: "จำนวนเงิน ≥",
    exp_amt_le: "≤",
    exp_empty: "ไม่พบรายการ",
    exp_deleted_cat: "(หมวดถูกลบ)",

    rec_add_title: "เพิ่มรายการประจำ",
    rec_all_title: "รายการประจำทั้งหมด",
    rec_category: "หมวดหมู่",
    rec_amount: "จำนวนเงิน (บาท)",
    rec_start: "เริ่มตั้งแต่",
    rec_every: "ทุก ๆ (เดือน)",
    rec_occ: "จำนวนครั้ง (ไม่บังคับ)",
    rec_until: "จนถึง (ไม่บังคับ)",
    rec_note: "หมายเหตุ",
    rec_apply_due: "Apply รายการที่ถึงกำหนด",
    rec_apply_one: "Apply",
    rec_delete: "ลบ",
    rec_none: "ยังไม่มีรายการประจำ",
    rec_deleted_cat: "(หมวดถูกลบ)",
  },

  en: {
    app_title: "Monthly Expense Helper — v2",
    menu_dashboard: "Dashboard",
    menu_add: "Add",
    menu_expenses: "Expenses",
    menu_recurring: "Recurring",
    menu_reports: "Reports",
    menu_settings: "Settings",

    dash_starts: "Cycle starts on day {{day}}",
    dash_budget: "Total Budget",
    dash_spent: "Spent",
    dash_remain: "Remaining",
    dash_pie: "Spend proportion (current cycle)",
    dash_bar: "Daily spend by category",
    loading: "Loading…",

    add_title: "Add Expense",
    add_date: "Date",
    add_cat: "Category",
    add_amount: "Amount (THB)",
    add_note: "Note (optional)",
    add_save: "Save",

    exp_title: "Expenses (filtered)",
    exp_search: "Search (notes)",
    exp_from: "From",
    exp_to: "To",
    exp_cat: "Category",
    exp_all: "All",
    exp_amt_ge: "Amount ≥",
    exp_amt_le: "≤",
    exp_empty: "No items",
    exp_deleted_cat: "(category deleted)",

    rec_add_title: "Add Recurring",
    rec_all_title: "All Recurrings",
    rec_category: "Category",
    rec_amount: "Amount (THB)",
    rec_start: "Start from",
    rec_every: "Every (months)",
    rec_occ: "Occurrences (optional)",
    rec_until: "Until (optional)",
    rec_note: "Note",
    rec_apply_due: "Apply all due",
    rec_apply_one: "Apply",
    rec_delete: "Delete",
    rec_none: "No recurring templates",
    rec_deleted_cat: "(category deleted)",
  },
};

function itpl(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars?.[k] ?? "");
}

export function useI18n() {
  const { settings } = useApp();
  const lang = settings?.locale === "en-US" ? "en" : "th";
  return (key, vars) => {
    const s = STR[lang][key] ?? STR.th[key] ?? key;
    return itpl(s, vars);
  };
}

/*
PWA + SQLite (WASM) — Expense Tracker (TH)
► Update (บั๊กฟิก & ฟีเจอร์): 
1) แก้ Error: ReferenceError: exportDataJSON is not defined — เพิ่มฟังก์ชัน exportDataJSON, importFromFile, exportSqlite ให้พร้อมใช้งาน
2) Export JSON รวม settings/categories/expenses/recurrings พร้อม meta เวอร์ชัน
3) Import JSON (overwrite ทั้งหมดแบบปลอดภัย + ตรวจรูปแบบข้อมูล)
4) Export SQLite (.sqlite) เมื่อใช้โหมด WASM; ถ้าไม่พร้อมจะ fallback เป็น JSON และแจ้งเตือน
5) เพิ่ม Unit Tests เพิ่มเติมสำหรับ payload export (ไม่แก้ของเดิม)
*/

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Plus, Settings, Trash2, Download, Upload, ChevronLeft, ChevronRight, Edit3, Palette } from "lucide-react";

// --- Minimal UI shims (แทน shadcn/ui ให้รันได้ทันที)
export function Card({ className = "", children }) { return <div className={`bg-white border ${className}`}>{children}</div>; }
export function CardHeader({ className = "", children }) { return <div className={`p-4 border-b ${className}`}>{children}</div>; }
export function CardContent({ className = "", children }) { return <div className={`p-4 ${className}`}>{children}</div>; }
export function CardTitle({ className = "", children }) { return <h3 className={`font-semibold ${className}`}>{children}</h3>; }
export function Button({ className = "", variant = "default", size, onClick, children, type }) {
  const base = "inline-flex items-center justify-center px-3 py-2 text-sm rounded-md transition active:scale-[.99]";
  const variants = { default: "bg-black text-white hover:opacity-90", outline: "border bg-white hover:bg-gray-50", ghost: "hover:bg-gray-100" };
  const sizes = { icon: "w-9 h-9 p-0", sm: "px-2 py-1 text-xs" };
  return (<button type={type} onClick={onClick} className={`${base} ${variants[variant]||variants.default} ${sizes[size]||""} ${className}`}>{children}</button>);
}
export function Input({ className = "", ...props }) { return <input {...props} className={`w-full border rounded-md px-3 py-2 text-sm ${className}`} />; }
export function Label({ className = "", children }) { return <label className={`block mb-1 ${className}`}>{children}</label>; }

// Select shim (native <select>) — ใช้ React ที่ import ไว้ด้านบน
const SelectCtx = React.createContext({ placeholder: "เลือก" });
export function Select({ value, onValueChange, className = "", children }) {
  const items = [];
  React.Children.forEach(children, (child) => {
    if (!child) return;
    if (child.type && child.type.displayName === "SelectContent") {
      React.Children.forEach(child.props.children, (c) => {
        if (c && c.type && c.type.displayName === "SelectItem") {
          items.push({ value: c.props.value, label: c.props.children });
        }
      });
    }
  });
  const ctx = { placeholder: "เลือก" };
  return (
    <SelectCtx.Provider value={ctx}>
      <select className={`w-full border rounded-md px-3 py-2 text-sm ${className}`} value={value}
        onChange={(e)=>onValueChange && onValueChange(e.target.value)}>
        {(!value || value === "") && <option value="">{ctx.placeholder}</option>}
        {items.map((it) => (<option key={it.value} value={it.value}>{it.label}</option>))}
      </select>
    </SelectCtx.Provider>
  );
}
export function SelectTrigger({ className = "", children }) { return <div className={`hidden ${className}`}>{children}</div>; }
SelectTrigger.displayName = "SelectTrigger";
export function SelectContent({ className = "", children }) { return <div className={`hidden ${className}`}>{children}</div>; }
SelectContent.displayName = "SelectContent";
export function SelectItem({ value, children }) { return <div data-value={value} className="hidden">{children}</div>; }
SelectItem.displayName = "SelectItem";
export function SelectValue({ placeholder }) { const ctx = React.useContext(SelectCtx); ctx.placeholder = placeholder || ctx.placeholder; return null; }
SelectValue.displayName = "SelectValue";

// =============================
// DB LAYER (SQLite WASM with fallback)
// =============================
let _engine = null; // จะถูกตั้งเป็น sqliteEngine หรือ localEngine อัตโนมัติ

const STORAGE_KEYS = { settings: "et_settings_v1", categories: "et_categories_v1", expenses: "et_expenses_v1", migrated: "et_migrated_to_sqlite_v1", recurrings: "et_recurrings_v1" };
const SQLJS_VERSION = "1.10.2";
const SQLJS_URLS = [
  `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/sql-wasm.js/+esm`,
  `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/sql-wasm.js`,
];
const WASM_CDN_URL = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/sql-wasm.wasm`;
const WASM_LOCAL_URL = `/sql-wasm.wasm`;

const thb = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 });
const APP_EXPORT_VERSION = "1.0.0";

function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addMonths(date, n){ const d=new Date(date); const day=d.getDate(); d.setMonth(d.getMonth()+n); if(d.getDate()!==day) d.setDate(0); return d; }

function getCycleRange(cycleStartDay, offsetFromCurrent=0){
  const today=new Date(); const y=today.getFullYear(); const m=today.getMonth();
  const candidateStart=new Date(y,m,cycleStartDay);
  const currentStart=today.getDate()>=cycleStartDay?candidateStart:new Date(y,m-1,cycleStartDay);
  const start=addMonths(currentStart,-offsetFromCurrent); const nextStart=addMonths(start,1);
  const end=new Date(nextStart.getTime()-1); return { start:startOfDay(start), end };
}

// ---------- LocalStorage Engine (Fallback)
const localEngine = {
  type: "local",
  async init(){ /* no-op */ },
  async loadSettings(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)||"null"); },
  async saveSettings(s){ localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s)); },
  async loadCategories(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.categories)||"[]"); },
  async saveCategories(arr){ localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(arr)); },
  async loadExpenses(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses)||"[]"); },
  async saveExpenses(arr){ localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(arr)); },
  async loadRecurrings(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.recurrings)||"[]"); },
  async saveRecurrings(arr){ localStorage.setItem(STORAGE_KEYS.recurrings, JSON.stringify(arr)); },
  async migrateFromLocalIfNeeded(){ /* already local */ },
};

function getWasmPathPreference(){ if (typeof window !== 'undefined' && window.__SQLJS_FORCE_LOCAL__) return WASM_LOCAL_URL; return WASM_CDN_URL; }

async function loadSqlJsResilient(){
  let lastErr;
  for (const url of SQLJS_URLS) {
    try {
      const mod = await import(/* @vite-ignore */ url);
      const initSqlJs = mod?.default || mod; // บางรูปแบบคืน default, บางรูปแบบคืนฟังก์ชันตรง ๆ
      if (typeof initSqlJs !== 'function') throw new Error('Invalid sql.js module shape');
      const SQL = await initSqlJs({ locateFile: () => getWasmPathPreference() });
      return SQL;
    } catch (e) { lastErr = e; console.warn('[sql.js] load failed at', url, e); }
  }
  throw lastErr;
}

// ---------- SQLite (sql.js) Engine
async function makeSqliteEngine(){
  try{
    const SQL = await loadSqlJsResilient();
    const db = new SQL.Database();

    db.run(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, budget REAL NOT NULL DEFAULT 0, color TEXT);
            CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, dateISO TEXT NOT NULL, categoryId TEXT NOT NULL, amount REAL NOT NULL, note TEXT);
            CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS recurrings (id TEXT PRIMARY KEY, categoryId TEXT NOT NULL, amount REAL NOT NULL, note TEXT, startISO TEXT NOT NULL, everyMonths INTEGER NOT NULL, occurrences INTEGER, untilISO TEXT, lastAppliedISO TEXT);`);
    try { db.run(`ALTER TABLE categories ADD COLUMN color TEXT`); } catch (_) { /* exists */ }
    try { db.run(`ALTER TABLE recurrings ADD COLUMN lastAppliedISO TEXT`); } catch (_) { /* exists */ }

    const api = {
      type: "sqlite",
      async init(){},
      async loadSettings(){ const res = db.exec("SELECT v FROM settings WHERE k='app'"); if(!res[0]) return null; return JSON.parse(res[0].values[0][0]); },
      async saveSettings(s){ const json=JSON.stringify(s); db.run("INSERT INTO settings(k,v) VALUES('app', $v) ON CONFLICT(k) DO UPDATE SET v=$v", { $v: json }); },
      async loadCategories(){ const res=db.exec("SELECT id,name,budget,COALESCE(color,'') FROM categories ORDER BY rowid DESC"); if(!res[0]) return []; return res[0].values.map(([id,name,budget,color])=>({id,name,budget,color})); },
      async saveCategories(arr){ db.run("DELETE FROM categories"); const stmt=db.prepare("INSERT INTO categories(id,name,budget,color) VALUES($id,$name,$budget,$color)"); db.run("BEGIN"); try{ arr.forEach(c=>stmt.run({$id:c.id,$name:c.name,$budget:Number(c.budget)||0,$color:c.color||""})); db.run("COMMIT"); }catch(e){ db.run("ROLLBACK"); throw e; } finally{ stmt.free(); } },
      async loadExpenses(){ const res=db.exec("SELECT id,dateISO,categoryId,amount,note FROM expenses ORDER BY dateISO DESC, rowid DESC"); if(!res[0]) return []; return res[0].values.map(([id,dateISO,categoryId,amount,note])=>({id,dateISO,categoryId,amount,note})); },
      async saveExpenses(arr){ db.run("DELETE FROM expenses"); const stmt=db.prepare("INSERT INTO expenses(id,dateISO,categoryId,amount,note) VALUES($id,$d,$c,$a,$n)"); db.run("BEGIN"); try{ arr.forEach(e=>stmt.run({$id:e.id,$d:e.dateISO,$c:e.categoryId,$a:Number(e.amount)||0,$n:e.note||""})); db.run("COMMIT"); }catch(e){ db.run("ROLLBACK"); throw e; } finally{ stmt.free(); } },
      async loadRecurrings(){ const res=db.exec("SELECT id,categoryId,amount,COALESCE(note,''),startISO,everyMonths,occurrences,untilISO,lastAppliedISO FROM recurrings ORDER BY rowid DESC"); if(!res[0]) return []; return res[0].values.map(([id,categoryId,amount,note,startISO,everyMonths,occurrences,untilISO,lastAppliedISO])=>({id,categoryId,amount,note,startISO,everyMonths,occurrences,untilISO,lastAppliedISO})); },
      async saveRecurrings(arr){ db.run("DELETE FROM recurrings"); const stmt=db.prepare("INSERT INTO recurrings(id,categoryId,amount,note,startISO,everyMonths,occurrences,untilISO,lastAppliedISO) VALUES($id,$c,$a,$n,$s,$m,$o,$u,$l)"); db.run("BEGIN"); try{ arr.forEach(r=>stmt.run({$id:r.id,$c:r.categoryId,$a:Number(r.amount)||0,$n:r.note||"",$s:r.startISO,$m:parseInt(r.everyMonths)||1,$o:r.occurrences==null?null:parseInt(r.occurrences),$u:r.untilISO||null,$l:r.lastAppliedISO||null})); db.run("COMMIT"); }catch(e){ db.run("ROLLBACK"); throw e; } finally{ stmt.free(); } },
      async migrateFromLocalIfNeeded(){ if(localStorage.getItem(STORAGE_KEYS.migrated)==="1") return; const s=JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)||"null"); const c=JSON.parse(localStorage.getItem(STORAGE_KEYS.categories)||"[]"); const e=JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses)||"[]"); const r=JSON.parse(localStorage.getItem(STORAGE_KEYS.recurrings)||"[]"); if(s) await api.saveSettings(s); if(c.length) await api.saveCategories(c); if(e.length) await api.saveExpenses(e); if(r.length) await api.saveRecurrings(r); localStorage.setItem(STORAGE_KEYS.migrated,"1"); },
      exportBinary(){ const data=db.export(); const blob=new Blob([data],{type:"application/octet-stream"}); return blob; }
    };
    return api;
  }catch(err){ console.warn("SQLite WASM not available, fallback to LocalStorage", err); return localEngine; }
}

async function getEngine(){ if(_engine) return _engine; _engine = await makeSqliteEngine(); await _engine.init(); return _engine; }

// ============ Export helpers (pure) ============
function composeExportPayload(settings, categories, expenses, recurrings){
  return {
    meta: { version: APP_EXPORT_VERSION, exportedAt: new Date().toISOString() },
    settings, categories, expenses, recurrings,
  };
}

// =============================
// React App
// =============================
const DEFAULT_SETTINGS = { cycleStartDay: 1, currency: "THB", locale: "th-TH", rollover: false };
const DEFAULT_CATEGORIES = [
  { id: uid(), name: "อาหาร/ขนม/บันเทิง", budget: 10000 },
  { id: uid(), name: "ของใช้จำเป็น/ซูเปอร์", budget: 5000 },
  { id: uid(), name: "น้ำมัน", budget: 6000 },
  { id: uid(), name: "ผ่อนรายเดือน", budget: 10000 },
  { id: uid(), name: "ค่าน้ำ/ค่าไฟ", budget: 4000 },
];

function hashString(str){ let h=0; for(let i=0;i<str.length;i++){ h=(h<<5)-h+str.charCodeAt(i); h|=0; } return Math.abs(h); }
function hslToHex(h,s,l){ s/=100; l/=100; const k=n=>(n+h/30)%12; const a=s*Math.min(l,1-l); const f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))); const toHex=x=>Math.round(x*255).toString(16).padStart(2,"0"); return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`; }
function colorForCategory(name, idx=0){ const base=hashString(name+String(idx)); const h=base%360; const s=65+(base%10); const l=50; return hslToHex(h,s,l); }

export default function ExpenseTrackerTH(){
  const [ready,setReady]=useState(false);
  const [settings,setSettings]=useState(DEFAULT_SETTINGS);
  const [categories,setCategories]=useState([]);
  const [expenses,setExpenses]=useState([]);
  const [recurrings,setRecurrings]=useState([]);

  const [tab,setTab]=useState("dashboard");
  const [cycleOffset,setCycleOffset]=useState(0);
  const { start:cycleStart, end:cycleEnd } = useMemo(()=> getCycleRange(Number(settings.cycleStartDay||1), Number(cycleOffset||0)), [settings.cycleStartDay, cycleOffset]);

  useEffect(()=>{(async()=>{ const eng=await getEngine(); await eng.migrateFromLocalIfNeeded?.(); let s=await eng.loadSettings(); let c=await eng.loadCategories(); let e=await eng.loadExpenses(); let r=await (eng.loadRecurrings?.()||[]); if(!s){ s=DEFAULT_SETTINGS; await eng.saveSettings(s); } if(!c||c.length===0){ c=DEFAULT_CATEGORIES; await eng.saveCategories(c); } // ensure color field
    c = c.map((cat,idx)=> ({ ...cat, color: cat.color && /^#([0-9a-f]{3}){1,2}$/i.test(cat.color) ? cat.color : colorForCategory(cat.name, idx) }));
    setSettings(s); setCategories(c); setExpenses(e); setRecurrings(r); setReady(true); })()},[]);
  useEffect(()=>{(async()=>{ if(!ready) return; const eng=await getEngine(); await eng.saveSettings(settings); })()},[settings,ready]);
  useEffect(()=>{(async()=>{ if(!ready) return; const eng=await getEngine(); await eng.saveCategories(categories); })()},[categories,ready]);
  useEffect(()=>{(async()=>{ if(!ready) return; const eng=await getEngine(); await eng.saveExpenses(expenses); })()},[expenses,ready]);
  useEffect(()=>{(async()=>{ if(!ready) return; const eng=await getEngine(); if(eng.saveRecurrings) await eng.saveRecurrings(recurrings); })()},[recurrings,ready]);

  const expensesInCycle = useMemo(()=> expenses.filter(e=>{ const d=new Date(e.dateISO); return d>=cycleStart && d<=cycleEnd; }),[expenses,cycleStart,cycleEnd]);

  // --- Rollover (รวมงบคงเหลือจากรอบก่อนหน้า)
  function getPrevCycleRange(){ const prev = getCycleRange(Number(settings.cycleStartDay||1), Number(cycleOffset||0)+1); return prev; }
  const prevTotalsByCategory = useMemo(()=>{ const prev=getPrevCycleRange(); const map={}; categories.forEach(c=>map[c.id]=0); expenses.filter(e=>{ const d=new Date(e.dateISO); return d>=prev.start && d<=prev.end; }).forEach(e=>{ map[e.categoryId]=(map[e.categoryId]||0)+Number(e.amount||0); }); return map; },[expenses,categories,settings.cycleStartDay,cycleOffset]);

  const totalsByCategory = useMemo(()=>{ const map={}; categories.forEach(c=>map[c.id]=0); expensesInCycle.forEach(e=>{ if(map[e.categoryId]==null) map[e.categoryId]=0; map[e.categoryId]+=Number(e.amount||0); }); return map; },[categories,expensesInCycle]);
  const sumBudgetBase = useMemo(()=> categories.reduce((a,c)=>a+Number(c.budget||0),0),[categories]);
  const sumBudget = useMemo(()=>{
    if(!settings.rollover) return sumBudgetBase;
    const carry = categories.reduce((acc,c)=>{ const spentPrev = Number(prevTotalsByCategory[c.id]||0); const remain = Math.max(0,(Number(c.budget||0)-spentPrev)); return acc+remain; },0);
    return sumBudgetBase + carry;
  },[categories,settings.rollover,prevTotalsByCategory,sumBudgetBase]);
  const sumSpent = useMemo(()=> Object.values(totalsByCategory).reduce((a,v)=>a+Number(v||0),0),[totalsByCategory]);
  const sumRemain = sumBudget - sumSpent;

  const categoryColors = useMemo(()=>{ const m={}; categories.forEach((c,idx)=> m[c.id]=(c.color && /^#([0-9a-f]{3}){1,2}$/i.test(c.color)? c.color : colorForCategory(c.name,idx))); return m; },[categories]);
  const pieData = useMemo(()=> categories.map(c=>({ id:c.id, name:c.name, value: totalsByCategory[c.id]||0, fill: categoryColors[c.id] })),[categories,totalsByCategory,categoryColors]);
  const barData = useMemo(()=>{ const days=[]; const start=new Date(cycleStart); const end=new Date(cycleEnd); const dayMs=86400000; for(let t=startOfDay(start).getTime(); t<=startOfDay(end).getTime(); t+=dayMs){ days.push(new Date(t)); } const rows=days.map(d=>{ const key=d.toISOString().slice(0,10); const r={ date:key }; categories.forEach(c=> r[c.id]=0 ); return r; }); const idx=Object.fromEntries(rows.map((r,i)=>[r.date,i])); expensesInCycle.forEach(e=>{ const k=new Date(e.dateISO).toISOString().slice(0,10); const i=idx[k]; if(i!=null){ rows[i][e.categoryId]=(rows[i][e.categoryId]||0)+Number(e.amount||0); } }); return rows; },[expensesInCycle,cycleStart,cycleEnd,categories]);

  // --- ฟอร์มเพิ่มรายการ (แยกแท็บ Add)
  const [form,setForm]=useState({ dateISO:new Date().toISOString().slice(0,10), categoryId:"", amount:"", note:"" });
  useEffect(()=>{ if(!form.categoryId && categories.length>0){ setForm(f=>({...f, categoryId: categories[0].id })); } },[categories]);
  function addExpense(e){ if(e?.preventDefault) e.preventDefault(); if(!form.categoryId||!form.dateISO||Number(form.amount)<=0) return; const item={ id:uid(), dateISO:form.dateISO, categoryId:form.categoryId, amount:Number(form.amount), note:form.note?.trim()||"" }; setExpenses(prev=>[item,...prev]); setForm({ dateISO:new Date().toISOString().slice(0,10), categoryId:categories[0]?.id||"", amount:"", note:"" }); }

  function deleteExpense(id){ setExpenses(prev=>prev.filter(e=>e.id!==id)); }
  function updateCategoryBudget(id,next){ setCategories(prev=>prev.map(c=> c.id===id?{...c, budget:Number(next)||0}:c)); }
  function renameCategory(id,name){ setCategories(prev=>prev.map(c=> c.id===id?{...c, name }:c)); }
  function setCategoryColor(id,color){ setCategories(prev=>prev.map(c=> c.id===id?{...c, color }:c)); }
  function addCategory(name,budget){ if(!name) return; setCategories(prev=>[{ id:uid(), name, budget:Number(budget)||0, color: colorForCategory(name, prev.length) },...prev]); }
  function deleteCategory(id){ setCategories(prev=>prev.filter(c=>c.id!==id)); }

  // ---------- ค้นหา/ตัวกรอง (แท็บ รายการใช้จ่าย)
  const [filters,setFilters]=useState({ q:"", from:"", to:"", cat:"", amin:"", amax:"" });
  const filtered = useMemo(()=>{
    let arr = [...expenses];
    if(filters.from) { const f=new Date(filters.from); arr = arr.filter(e=> new Date(e.dateISO)>=f); }
    if(filters.to) { const t=new Date(filters.to); t.setHours(23,59,59,999); arr = arr.filter(e=> new Date(e.dateISO)<=t); }
    if(filters.cat) arr = arr.filter(e=> e.categoryId===filters.cat);
    if(filters.q) arr = arr.filter(e=> (e.note||"").toLowerCase().includes(filters.q.toLowerCase()));
    if(filters.amin) arr = arr.filter(e=> Number(e.amount)>=Number(filters.amin));
    if(filters.amax) arr = arr.filter(e=> Number(e.amount)<=Number(filters.amax));
    return arr.sort((a,b)=> new Date(b.dateISO)-new Date(a.dateISO));
  },[expenses,filters]);

  // ---------- รายงาน & ส่งออก
  const [reportType,setReportType]=useState("daily");
  const [reportFrom,setReportFrom]=useState("");
  const [reportTo,setReportTo]=useState("");
  function inRange(d){ if(reportFrom && d < new Date(reportFrom)) return false; if(reportTo){ const t=new Date(reportTo); t.setHours(23,59,59,999); if(d>t) return false; } return true; }
  const reportRows = useMemo(()=>{
    const rows=[]; const map={}; const list = expenses.filter(e=> inRange(new Date(e.dateISO)));
    if(reportType==='daily'){
      list.forEach(e=>{ const k=new Date(e.dateISO).toISOString().slice(0,10); map[k]=(map[k]||0)+Number(e.amount); });
      Object.entries(map).sort().forEach(([k,v])=> rows.push([k, thb.format(v)]));
    } else if(reportType==='monthly'){
      list.forEach(e=>{ const d=new Date(e.dateISO); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; map[k]=(map[k]||0)+Number(e.amount); });
      Object.entries(map).sort().forEach(([k,v])=> rows.push([k, thb.format(v)]));
    } else { // byCategory
      list.forEach(e=>{ const name=categories.find(c=>c.id===e.categoryId)?.name||"(ลบแล้ว)"; map[name]=(map[name]||0)+Number(e.amount); });
      Object.entries(map).sort().forEach(([k,v])=> rows.push([k, thb.format(v)]));
    }
    return rows;
  },[reportType,reportFrom,reportTo,expenses,categories]);
  const reportHeaders = useMemo(()=> reportType==='byCategory'?['หมวด','ยอดรวม']:['ช่วง','ยอดรวม'] ,[reportType]);
  function exportCSV(type){ const header=reportHeaders.join(","); const csv=[header,...reportRows.map(r=> r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(","))].join("\n"); const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`report-${type}-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url); }
  function exportExcel(type){ // HTML table ที่ Excel เปิดได้
    const tableHtml = `<table>${[`<tr>${reportHeaders.map(h=>`<th>${h}</th>`).join('')}</tr>`, ...reportRows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`)].join('')}</table>`;
    const blob=new Blob([tableHtml],{type:"application/vnd.ms-excel"}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`report-${type}-${Date.now()}.xls`; a.click(); URL.revokeObjectURL(url); }

  // ---------- รายการประจำ (Recurring)
  const [recForm,setRecForm]=useState({ categoryId:"", amount:"", note:"", startISO:new Date().toISOString().slice(0,10), everyMonths:1, occurrences:"", untilISO:"" });
  useEffect(()=>{ if(!recForm.categoryId && categories.length>0){ setRecForm(f=>({...f, categoryId: categories[0].id })); } },[categories]);
  function addRecurring(ev){ ev.preventDefault(); if(!recForm.categoryId||!recForm.startISO||Number(recForm.amount)<=0) return; const item={ id:uid(), categoryId:recForm.categoryId, amount:Number(recForm.amount), note:recForm.note||"", startISO:recForm.startISO, everyMonths:Number(recForm.everyMonths)||1, occurrences: recForm.occurrences? Number(recForm.occurrences): null, untilISO: recForm.untilISO||null, lastAppliedISO:null }; setRecurrings(prev=>[item,...prev]); setRecForm({ categoryId:categories[0]?.id||"", amount:"", note:"", startISO:new Date().toISOString().slice(0,10), everyMonths:1, occurrences:"", untilISO:"" }); }
  function deleteRecurring(id){ setRecurrings(prev=>prev.filter(r=>r.id!==id)); }

  // apply recurring on first ready & whenever recurrings changes (idempotent)
  useEffect(()=>{ if(!ready) return; applyRecurrings(); /* eslint-disable-next-line */ },[ready, recurrings.length]);
  function addMonthsISO(iso, n){ const d=new Date(iso+"T00:00:00"); d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,10); }
  function applyRecurrings(){ setExpenses(prev=>{
      let list=[...prev];
      let changed=false;
      let nextRecurrings=[...recurrings];
      for(let i=0;i<nextRecurrings.length;i++){
        const r = {...nextRecurrings[i]};
        let applyFrom = r.lastAppliedISO? addMonthsISO(r.lastAppliedISO, r.everyMonths) : r.startISO;
        while(true){
          const d = new Date(applyFrom+"T00:00:00");
          if(isNaN(d)) break;
          if(r.untilISO && d>new Date(r.untilISO+"T23:59:59")) break;
          if(d>new Date()) break; // อย่าสร้างอนาคต
          // ตรวจ occurrences ถ้ามี: หยุดเมื่อครบจำนวนงวดที่ควรจะเป็น (จาก start ถึง applyFrom)
          if(r.occurrences!=null){
            const monthsDiff = (d.getFullYear()-new Date(r.startISO).getFullYear())*12 + (d.getMonth()-new Date(r.startISO).getMonth());
            const idx = Math.floor(monthsDiff / r.everyMonths) + 1; // ลำดับงวด (1-based)
            if(idx>r.occurrences) break;
          }
          const tag = ` [🔁 ${r.id}:${applyFrom}]`;
          if(!list.some(e=> e.note && e.note.includes(`[🔁 ${r.id}:`) && e.dateISO===applyFrom && e.amount===r.amount && e.categoryId===r.categoryId)){
            list.push({ id:uid(), dateISO:applyFrom, categoryId:r.categoryId, amount:r.amount, note:(r.note||"")+tag });
            changed=true;
          }
          r.lastAppliedISO = applyFrom;
          applyFrom = addMonthsISO(applyFrom, r.everyMonths);
        }
        nextRecurrings[i]=r;
      }
      if(changed) setRecurrings(nextRecurrings);
      return list.sort((a,b)=> new Date(b.dateISO)-new Date(a.dateISO));
    });
  }

  // ---------- Export / Import (JSON & SQLite)
  function gatherExportPayload(){ return composeExportPayload(settings, categories, expenses, recurrings); }
  function downloadBlob(blob, filename){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
  function timestamp(){ const d=new Date(); const p=(n)=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
  function exportDataJSON(){ const payload=gatherExportPayload(); const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); downloadBlob(blob, `expense-export-${timestamp()}.json`); }
  async function importFromFile(ev){ try{ const file=ev.target?.files?.[0]; if(!file) return; const text=await file.text(); const data=JSON.parse(text); if(!data||!data.settings||!Array.isArray(data.categories)||!Array.isArray(data.expenses)||!Array.isArray(data.recurrings||[])){ alert("ไฟล์ไม่ถูกต้อง: โครงสร้างไม่ครบถ้วน"); return; } const eng=await getEngine(); await eng.saveSettings(data.settings); await eng.saveCategories(data.categories); await eng.saveExpenses(data.expenses); if(eng.saveRecurrings) await eng.saveRecurrings(data.recurrings||[]); setSettings(data.settings); setCategories(data.categories); setExpenses(data.expenses); setRecurrings(data.recurrings||[]); alert("นำเข้าข้อมูลสำเร็จ ✅"); }catch(err){ console.error(err); alert("นำเข้าข้อมูลล้มเหลว: "+err.message); } }
  async function exportSqlite(){ try{ const eng=await getEngine(); if(eng.type==='sqlite' && typeof eng.exportBinary==='function'){ const blob=await eng.exportBinary(); downloadBlob(blob, `expense-db-${timestamp()}.sqlite`); } else { alert("ยังไม่พร้อมส่งออก SQLite บนโหมด Local — จะส่งออกเป็น JSON แทน"); exportDataJSON(); } }catch(err){ console.error(err); alert("ส่งออกล้มเหลว: "+err.message); } }

  const periodLabel = `${new Date(cycleStart).toLocaleDateString("th-TH")} - ${new Date(cycleEnd).toLocaleDateString("th-TH")}`;
  if(!ready){ return (<div className="min-h-screen grid place-items-center text-gray-500">กำลังเตรียมฐานข้อมูล…</div>); }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-semibold">฿</div>
            <div>
              <h1 className="text-lg font-bold">ตัวช่วยบันทึกค่าใช้จ่ายรายเดือน (PWA + SQLite)</h1>
              <p className="text-xs text-gray-500">รอบบิล: {periodLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={()=>setTab("settings")} className="rounded-2xl"><Settings className="h-4 w-4 mr-2"/>ตั้งค่า</Button>
          </div>
        </div>
      </header>

      <nav className="max-w-5xl mx-auto px-4 pt-3">
        <div className="grid grid-cols-7 gap-2">
          {[{k:"dashboard",label:"แดชบอร์ด"},{k:"add",label:"เพิ่มรายการ"},{k:"expenses",label:"รายการใช้จ่าย"},{k:"reports",label:"รายงาน"},{k:"recurring",label:"รายการประจำ"},{k:"categories",label:"หมวดหมู่ & งบ"},{k:"settings",label:"ตั้งค่า"}].map(t=> (
            <Button key={t.k} variant={tab===t.k?"default":"outline"} onClick={()=>setTab(t.k)} className="rounded-2xl text-sm py-2">{t.label}</Button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          {tab==="dashboard" && (
            <motion.section key="dashboard" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 space-y-4">
              <Card className="rounded-2xl"><CardContent className="p-4"><div className="flex items-center justify-between gap-3 flex-wrap"><div className="flex items-center gap-2"><Button variant="outline" onClick={()=>setCycleOffset(v=>v+1)} className="rounded-2xl"><ChevronLeft className="h-4 w-4"/></Button><div className="text-sm text-gray-600">{periodLabel}</div><Button variant="outline" onClick={()=>setCycleOffset(v=>Math.max(0,v-1))} className="rounded-2xl"><ChevronRight className="h-4 w-4"/></Button></div><div className="text-xs text-gray-500">เริ่มทุกวันที่ {settings.cycleStartDay}</div></div></CardContent></Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm">งบรวม{settings.rollover?" (รวม Rollover)":""}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{thb.format(sumBudget)}</CardContent></Card>
                <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm">ใช้ไปแล้ว</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{thb.format(sumSpent)}</CardContent></Card>
                <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm">คงเหลือ</CardTitle></CardHeader><CardContent className={`text-2xl font-bold ${sumRemain<0?"text-red-600":""}`}>{thb.format(sumRemain)}</CardContent></Card>
              </div>

              <Card className="rounded-2xl"><CardHeader className="pb-1"><CardTitle className="text-base">สรุปตามหมวดหมู่</CardTitle></CardHeader><CardContent className="space-y-3">{categories.length===0 && <div className="text-sm text-gray-500">ยังไม่มีหมวดหมู่</div>}{categories.map((c)=>{ const spent=totalsByCategory[c.id]||0; const budget=Number(c.budget||0); const over=budget>0 && spent>budget; const color=categoryColors[c.id]; return (<div key={c.id} className="p-3 rounded-xl border bg-white"><div className="flex items-center justify-between text-sm"><div className="font-medium flex items-center gap-2"><span className="inline-block w-3 h-3 rounded" style={{backgroundColor:color}}/> {c.name}</div><div className="text-right"><div className="font-semibold">{thb.format(spent)} / {thb.format(budget)}</div><div className={`text-xs ${over?"text-red-600":"text-gray-500"}`}>{over?"เกินงบแล้ว":`คงเหลือ ${thb.format(budget-spent)}`}</div></div></div><div className="h-2 rounded-full bg-gray-200 mt-2 overflow-hidden"><div className={`h-full ${over?"bg-red-500":''}`} style={{ width: `${Math.min(100, (budget>0?(spent/budget)*100:0))}%`, backgroundColor: over?undefined:color }}/></div></div>); })}</CardContent></Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">สัดส่วนค่าใช้จ่าย (รอบนี้)</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>{pieData.map((entry,idx)=>(<Cell key={entry.id||idx} fill={entry.fill}/>))}</Pie><Tooltip formatter={(v)=>thb.format(Number(v))}/><Legend/></PieChart></ResponsiveContainer></CardContent></Card>
                <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">ค่าใช้จ่ายรายวัน (แยกตามหมวด)</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`}/><Tooltip formatter={(v)=>thb.format(Number(v))}/><Legend/>{categories.map((c)=>(<Bar key={c.id} dataKey={c.id} name={c.name} stackId="a" fill={categoryColors[c.id]}/>))}</BarChart></ResponsiveContainer></CardContent></Card>
              </div>
            </motion.section>
          )}

          {tab==="add" && (
            <motion.section key="add" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 space-y-4">
              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">เพิ่มรายการใหม่</CardTitle></CardHeader><CardContent>
                <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div><Label className="text-xs">วันที่</Label><Input type="date" value={form.dateISO} onChange={(e)=>setForm({...form,dateISO:e.target.value})} className="rounded-xl"/></div>
                  <div><Label className="text-xs">หมวดหมู่</Label><Select value={form.categoryId} onValueChange={(v)=>setForm({...form,categoryId:v})}><SelectTrigger className="rounded-xl"><SelectValue placeholder="เลือกหมวด"/></SelectTrigger><SelectContent>{categories.map(c=>(<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label className="text-xs">จำนวนเงิน (บาท)</Label><Input type="number" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} className="rounded-xl"/></div>
                  <div className="md:col-span-2"><Label className="text-xs">หมายเหตุ (ถ้ามี)</Label><Input type="text" placeholder="ระบุรายละเอียด" value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})} className="rounded-xl"/></div>
                  <div className="md:col-span-5 flex gap-2"><Button type="submit" className="rounded-2xl"><Plus className="h-4 w-4 mr-2"/>บันทึก</Button></div>
                </form>
              </CardContent></Card>
            </motion.section>
          )}

          {tab==="expenses" && (
            <motion.section key="expenses" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 space-y-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-base">ค้นหา/ตัวกรอง</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2"><Label className="text-xs">คำค้น (ในหมายเหตุ)</Label><Input value={filters.q} onChange={(e)=>setFilters({...filters,q:e.target.value})} placeholder="เช่น Starbucks, น้ำมัน" className="rounded-xl"/></div>
                  <div><Label className="text-xs">จากวันที่</Label><Input type="date" value={filters.from} onChange={(e)=>setFilters({...filters,from:e.target.value})} className="rounded-xl"/></div>
                  <div><Label className="text-xs">ถึงวันที่</Label><Input type="date" value={filters.to} onChange={(e)=>setFilters({...filters,to:e.target.value})} className="rounded-xl"/></div>
                  <div><Label className="text-xs">หมวดหมู่</Label><Select value={filters.cat||""} onValueChange={(v)=>setFilters({...filters,cat:v})}><SelectTrigger className="rounded-xl"><SelectValue placeholder="ทั้งหมด"/></SelectTrigger><SelectContent><SelectItem value="">ทั้งหมด</SelectItem>{categories.map(c=>(<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                  <div className="flex gap-2"><div className="flex-1"><Label className="text-xs">จำนวนเงิน ≥</Label><Input type="number" value={filters.amin} onChange={(e)=>setFilters({...filters,amin:e.target.value})} className="rounded-xl"/></div><div className="flex-1"><Label className="text-xs">≤</Label><Input type="number" value={filters.amax} onChange={(e)=>setFilters({...filters,amax:e.target.value})} className="rounded-xl"/></div></div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">รายการใช้จ่าย (ตามตัวกรอง)</CardTitle></CardHeader><CardContent className="space-y-3">{filtered.length===0 && <div className="text-sm text-gray-500">ไม่พบรายการ</div>}<div className="grid grid-cols-1 gap-2">{filtered.map(e=>{ const cat=categories.find(c=>c.id===e.categoryId); return (<div key={e.id} className="rounded-xl border bg-white p-3 flex items-center justify-between"><div><div className="text-sm font-medium"><span className="inline-flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:categoryColors[cat?.id]}}/> {cat?.name||"(หมวดถูกลบ)"}</span> <span className="text-gray-400">• {new Date(e.dateISO).toLocaleDateString("th-TH")}</span></div>{e.note && <div className="text-xs text-gray-500 mt-0.5">{e.note}</div>}</div><div className="flex items-center gap-3"><div className="font-semibold">{thb.format(e.amount)}</div><Button size="icon" variant="outline" onClick={()=>deleteExpense(e.id)} className="rounded-xl"><Trash2 className="h-4 w-4"/></Button></div></div>); })}</div></CardContent></Card>
            </motion.section>
          )}

          {tab==="reports" && (
            <motion.section key="reports" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 space-y-4">
              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">รายงาน & ส่งออก</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">รูปแบบรายงาน</Label>
                      <Select value={reportType} onValueChange={setReportType}><SelectTrigger className="rounded-xl"/><SelectContent>
                        <SelectItem value="daily">รายวัน</SelectItem>
                        <SelectItem value="monthly">รายเดือน</SelectItem>
                        <SelectItem value="byCategory">รายหมวด</SelectItem>
                      </SelectContent></Select>
                    </div>
                    <div><Label className="text-xs">จากวันที่</Label><Input type="date" value={reportFrom} onChange={(e)=>setReportFrom(e.target.value)} className="rounded-xl"/></div>
                    <div><Label className="text-xs">ถึงวันที่</Label><Input type="date" value={reportTo} onChange={(e)=>setReportTo(e.target.value)} className="rounded-xl"/></div>
                    <div className="flex items-end gap-2">
                      <Button variant="outline" onClick={()=>exportCSV(reportType)} className="rounded-2xl"><Download className="h-4 w-4 mr-2"/>CSV</Button>
                      <Button variant="outline" onClick={()=>exportExcel(reportType)} className="rounded-2xl">Excel</Button>
                    </div>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead><tr>{reportHeaders.map((h)=> <th key={h} className="text-left px-2 py-1 border-b">{h}</th>)}</tr></thead>
                      <tbody>
                        {reportRows.map((row,i)=> (
                          <tr key={i} className="odd:bg-gray-50">
                            {row.map((cell,j)=> <td key={j} className="px-2 py-1 border-b">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {tab==="recurring" && (
            <motion.section key="recurring" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 space-y-4">
              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">รายการประจำ</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <form onSubmit={addRecurring} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div><Label className="text-xs">หมวด</Label><Select value={recForm.categoryId} onValueChange={(v)=>setRecForm({...recForm,categoryId:v})}><SelectTrigger className="rounded-xl"/><SelectContent>{categories.map(c=>(<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                    <div><Label className="text-xs">จำนวนเงิน</Label><Input type="number" value={recForm.amount} onChange={(e)=>setRecForm({...recForm,amount:e.target.value})} className="rounded-xl"/></div>
                    <div><Label className="text-xs">เริ่มวันที่</Label><Input type="date" value={recForm.startISO} onChange={(e)=>setRecForm({...recForm,startISO:e.target.value})} className="rounded-xl"/></div>
                    <div><Label className="text-xs">ทุกกี่เดือน</Label><Input type="number" min="1" value={recForm.everyMonths} onChange={(e)=>setRecForm({...recForm,everyMonths:e.target.value})} className="rounded-xl"/></div>
                    <div><Label className="text-xs">จำนวนงวด (เว้นว่าง = ไม่จำกัดจนถึงวันสิ้นสุด)</Label><Input type="number" value={recForm.occurrences} onChange={(e)=>setRecForm({...recForm,occurrences:e.target.value})} className="rounded-xl"/></div>
                    <div><Label className="text-xs">ถึงวันที่ (ถ้ามี)</Label><Input type="date" value={recForm.untilISO} onChange={(e)=>setRecForm({...recForm,untilISO:e.target.value})} className="rounded-xl"/></div>
                    <div className="md:col-span-6"><Label className="text-xs">หมายเหตุ</Label><Input value={recForm.note} onChange={(e)=>setRecForm({...recForm,note:e.target.value})} className="rounded-xl"/></div>
                    <div className="md:col-span-6"><Button type="submit" className="rounded-2xl"><Plus className="h-4 w-4 mr-2"/>เพิ่มรายการประจำ</Button></div>
                  </form>

                  <div className="grid grid-cols-1 gap-2">
                    {recurrings.map(r=> (
                      <div key={r.id} className="rounded-xl border bg-white p-3 flex items-center justify-between">
                        <div className="text-sm">
                          <div className="font-medium">{(categories.find(c=>c.id===r.categoryId)?.name)||"(หมวด)"} • {thb.format(r.amount)} • ทุก {r.everyMonths} เดือน เริ่ม {new Date(r.startISO).toLocaleDateString('th-TH')}</div>
                          <div className="text-xs text-gray-500">{r.occurrences?`จำนวนงวด ${r.occurrences}`:"ไม่กำหนดจำนวนงวด"} {r.untilISO?`• ถึง ${new Date(r.untilISO).toLocaleDateString('th-TH')}`:""}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={()=>deleteRecurring(r.id)} className="rounded-xl"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {tab==="categories" && (
            <motion.section key="categories" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 space-y-4"><AddCategoryCard onAdd={addCategory}/><Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">หมวดหมู่และงบประมาณ</CardTitle></CardHeader><CardContent className="space-y-3">{categories.length===0 && <div className="text-sm text-gray-500">ยังไม่มีหมวดหมู่</div>}{categories.map(c=> (<div key={c.id} className="rounded-xl border bg-white p-3 flex items-center justify-between gap-3"><div className="flex-1 space-y-1"><InlineEditableText text={c.name} onChange={(t)=>renameCategory(c.id,t)}/><div className="text-xs text-gray-500">งบประมาณ/รอบบิล</div></div><div className="flex items-center gap-2"><Input type="number" className="w-28 rounded-xl" value={c.budget} onChange={(e)=>updateCategoryBudget(c.id,e.target.value)}/><div className="flex items-center gap-1"><Palette className="w-4 h-4 text-gray-500"/><input type="color" value={c.color||categoryColors[c.id]} onChange={(e)=>setCategoryColor(c.id, e.target.value)} className="w-9 h-9 p-0 bg-transparent border rounded" title="เลือกสีหมวด"/></div><Button size="icon" variant="outline" onClick={()=>deleteCategory(c.id)} className="rounded-xl"><Trash2 className="h-4 w-4"/></Button></div></div>))}</CardContent></Card></motion.section>
          )}

          {tab==="settings" && (
            <motion.section key="settings" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 space-y-4"><Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">การตั้งค่ารอบบิล</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div><Label className="text-xs">เริ่มรอบบิลวันที่ (1-28)</Label><Input type="number" className="rounded-xl" value={settings.cycleStartDay} onChange={(e)=>setSettings({ ...settings, cycleStartDay: Math.min(28, Math.max(1, Number(e.target.value||1))) })}/><div className="text-xs text-gray-500 mt-1">เช่น กำหนด 18 จะได้รอบบิล 18 ถึง 17 ของเดือนถัดไป</div></div><div><Label className="text-xs">หน่วยสกุลเงิน</Label><Select value={settings.currency} onValueChange={(v)=>setSettings({ ...settings, currency: v })}><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="THB">THB (บาท)</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="JPY">JPY</SelectItem></SelectContent></Select></div><div><Label className="text-xs">ภาษา/รูปแบบตัวเลข</Label><Select value={settings.locale} onValueChange={(v)=>setSettings({ ...settings, locale: v })}><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="th-TH">ไทย</SelectItem><SelectItem value="en-US">English (US)</SelectItem><SelectItem value="ja-JP">日本語</SelectItem></SelectContent></Select></div></div></CardContent></Card>

              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">งบแบบยืดหยุ่น (Rollover)</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!settings.rollover} onChange={(e)=>setSettings({...settings, rollover: e.target.checked})}/><span>นำงบที่เหลือจากรอบก่อนหน้าไปรวมกับงบของรอบปัจจุบัน</span></label><div className="text-xs text-gray-500">หมายเหตุ: เวอร์ชันนี้คำนวณจาก "รอบก่อนหน้า" เท่านั้นเพื่อความเร็ว</div></CardContent></Card>

              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">สำรอง/กู้คืนข้อมูล</CardTitle></CardHeader><CardContent className="flex flex-col md:flex-row items-start md:items-center gap-3"><Button onClick={exportDataJSON} className="rounded-2xl"><Download className="h-4 w-4 mr-2"/>ส่งออก JSON</Button><div><label className="inline-flex items-center gap-2 text-sm cursor-pointer"><Upload className="h-4 w-4"/><span>นำเข้า JSON</span><input type="file" accept="application/json" className="hidden" onChange={importFromFile}/></label></div><Button variant="outline" onClick={exportSqlite} className="rounded-2xl">ส่งออกฐานข้อมูล (.sqlite)</Button></CardContent></Card>

              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">คู่มือย่อ</CardTitle></CardHeader><CardContent className="text-sm text-gray-600 space-y-1"><p>• แอปนี้รองรับ PWA + SQLite (sql.js) โดยมี fallback เป็น LocalStorage</p><p>• วางไฟล์ <code>public/sql-wasm.wasm</code> แล้ว build PWA เพื่อใช้งานออฟไลน์เต็มรูปแบบ</p></CardContent></Card></motion.section>
          )}
        </AnimatePresence>
        <footer className="text-center text-xs text-gray-400 mt-6 mb-10">ทำงานบนเบราว์เซอร์ — รองรับมือถือ iPhone/Android • PWA-ready</footer>
      </main>
    </div>
  );
}

function AddCategoryCard({ onAdd }){ const [name,setName]=useState(""); const [budget,setBudget]=useState(""); return (
  <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-base">เพิ่มหมวดหมู่ใหม่</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div><Label className="text-xs">ชื่อหมวด</Label><Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="เช่น อาหารกลางวัน" className="rounded-xl"/></div><div><Label className="text-xs">งบประมาณ/รอบบิล</Label><Input type="number" value={budget} onChange={(e)=>setBudget(e.target.value)} placeholder="0" className="rounded-xl"/></div><div><Label className="text-xs">สีของหมวด</Label><input type="color" defaultValue="#5b6cff" onChange={(e)=>{/* preview only */}} className="w-full h-10 p-0 bg-transparent border rounded"/></div><div className="flex items-end"><Button onClick={()=>{ onAdd(name.trim(), Number(budget)||0); setName(""); setBudget(""); }} className="w-full rounded-2xl"><Plus className="h-4 w-4 mr-2"/>เพิ่มหมวด</Button></div></div></CardContent></Card>
); }

function InlineEditableText({ text, onChange }){ const [editing,setEditing]=useState(false); const [val,setVal]=useState(text); useEffect(()=>setVal(text),[text]); return (
  <div className="flex items-center gap-2">{editing? (<><Input value={val} onChange={(e)=>setVal(e.target.value)} className="rounded-xl"/><Button size="sm" className="rounded-xl" onClick={()=>{ onChange(val.trim()); setEditing(false); }}>บันทึก</Button><Button size="sm" variant="outline" className="rounded-xl" onClick={()=>{ setVal(text); setEditing(false); }}>ยกเลิก</Button></>) : (<><div className="font-medium">{text}</div><Button size="icon" variant="ghost" onClick={()=>setEditing(true)} className="rounded-xl"><Edit3 className="h-4 w-4"/></Button></>)}</div>
); }

// =============================
// Dev Tests (opt‑in)
// เรียกใช้: window.__expense_tests__()
// =============================
function __runTests(){
  const assert = (cond, msg) => { if(!cond){ throw new Error("Test failed: "+msg); } };
  // uid unique
  const ids = new Set(Array.from({length: 300}, ()=>uid()));
  assert(ids.size === 300, "uid ควรไม่ซ้ำ (300 ครั้ง)");
  // cycle range sane
  const r = getCycleRange(18, 0);
  assert(r.start instanceof Date && r.end instanceof Date && r.end >= r.start, "ช่วงเวลาต้องถูกต้อง");
  // color deterministic
  const c1 = colorForCategory("อาหาร",0), c2 = colorForCategory("อาหาร",0);
  assert(c1 === c2, "สีต้องคงที่ตามชื่อหมวด");
  // SQLJS URL sanity
  SQLJS_URLS.forEach(u=> assert(!u.includes('npm/https://'), 'SQLJS_URL ผิดรูป: มีการซ้อน https://'));
  // filter basic
  const sampleExpenses=[
    {id:'e1',dateISO:'2025-01-10',categoryId:'c1',amount:100,note:'coffee'},
    {id:'e2',dateISO:'2025-01-12',categoryId:'c2',amount:300,note:'fuel'},
    {id:'e3',dateISO:'2025-01-15',categoryId:'c1',amount:200,note:'lunch'},
  ];
  let filters={ q:'',from:'2025-01-11',to:'2025-01-31',cat:'',amin:'150',amax:'' };
  let arr=[...sampleExpenses];
  const f=new Date(filters.from); arr = arr.filter(e=> new Date(e.dateISO)>=f);
  arr = arr.filter(e=> Number(e.amount)>=Number(filters.amin));
  assert(arr.length===2, 'ตัวกรองพื้นฐานควรคืน 2 แถว');
  // export payload shape
  const payload = composeExportPayload({a:1}, [{id:'c1',name:'X',budget:1}], [{id:'e',dateISO:'2025-01-01',categoryId:'c1',amount:1,note:''}], []);
  assert(payload.meta && payload.settings && Array.isArray(payload.categories) && Array.isArray(payload.expenses), 'export payload ต้องมีฟิลด์หลักครบ');
  console.log("All tests passed ✅");
}
if (typeof window !== "undefined") {
  window.__expense_tests__ = __runTests;
  window.__expense_utils__ = { getCycleRange, colorForCategory, uid };
  window.__SQLJS_URLS__ = SQLJS_URLS;
}

// src/features/AddExpense.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../data/app-state';


export default function AddExpense(){
const { ready, categories, setExpenses, uid } = useApp();
const [form,setForm]=useState({ dateISO:new Date().toISOString().slice(0,10), categoryId:"", amount:"", note:"" });
useEffect(()=>{ if(!form.categoryId && categories.length>0){ setForm(f=>({...f, categoryId: categories[0].id })); } },[categories]);
if(!ready) return null;


function addExpense(e){ e.preventDefault(); if(!form.categoryId||!form.dateISO||Number(form.amount)<=0) return;
const item={ id:uid(), dateISO:form.dateISO, categoryId:form.categoryId, amount:Number(form.amount), note:form.note?.trim()||"" };
setExpenses(prev=>[item,...prev]);
setForm({ dateISO:new Date().toISOString().slice(0,10), categoryId:categories[0]?.id||"", amount:"", note:"" });
}


return (
<section className="mt-4">
<div className="rounded-2xl border bg-white p-4">
<h3 className="font-semibold mb-3">เพิ่มรายการใหม่</h3>
<form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-5 gap-3">
<div>
<label className="text-xs">วันที่</label>
<input type="date" value={form.dateISO} onChange={(e)=>setForm({...form,dateISO:e.target.value})} className="w-full border rounded-xl px-3 py-2"/>
</div>
<div>
<label className="text-xs">หมวดหมู่</label>
<select value={form.categoryId} onChange={(e)=>setForm({...form,categoryId:e.target.value})} className="w-full border rounded-xl px-3 py-2">
{categories.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
</select>
</div>
<div>
<label className="text-xs">จำนวนเงิน (บาท)</label>
<input type="number" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} className="w-full border rounded-xl px-3 py-2"/>
</div>
<div className="md:col-span-2">
<label className="text-xs">หมายเหตุ (ถ้ามี)</label>
<input type="text" placeholder="ระบุรายละเอียด" value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})} className="w-full border rounded-xl px-3 py-2"/>
</div>
<div className="md:col-span-5">
<button type="submit" className="px-4 py-2 bg-black text-white rounded-2xl">บันทึก</button>
</div>
</form>
</div>
</section>
);
}
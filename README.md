# Expense Tracker V2 🚀

## 📖 Overview

โปรเจกต์นี้เป็นระบบบันทึกค่าใช้จ่ายรายเดือน (เวอร์ชัน 2)
สร้างขึ้นใหม่บน **React + Vite + TailwindCSS** โดยมีการปรับโครงสร้างและฟีเจอร์เพิ่มเติมจากเวอร์ชันแรก
เน้นการใช้งานง่าย รองรับมือถือ และสามารถต่อยอดฟีเจอร์ Gamification ได้ในอนาคต

---

## ⚡ การเริ่มใช้งาน

```bash
npm install
npm run dev
เปิดเบราว์เซอร์ที่ http://localhost:5173

📌 Features

Dashboard — แสดงสรุปภาพรวมรายจ่าย

Add Expense — เพิ่มรายการค่าใช้จ่ายใหม่

Expenses — ดูและค้นหารายการย้อนหลัง

Recurring — จัดการค่าใช้จ่ายประจำ

Settings — ตั้งค่ารอบตัดงบ, หมวดหมู่, ภาษา, backup/restore JSON

🎨 การปรับปรุงล่าสุด (V2)

ธีมใหม่

เปลี่ยนพื้นหลังเป็นโทน น้ำเงินเข้ม (dark navy) ตัดกับการ์ดสีขาว

ใช้ safe-area สำหรับ iPhone (Dynamic Island / Notch)

ปิดการซูมบนมือถือเพื่อ UX ที่ดีขึ้น

โลโก้และแบรนด์

โลโก้ใหม่ (กระเป๋าเงิน + แว่นขยาย + กราฟ, น้ำเงิน–ขาว)

ชื่อแอป: Expense Tracker

ขยายโลโก้ให้ใหญ่ขึ้นใน Header เพื่อความโดดเด่น

การออกแบบเมนู

ใช้ Lucide Icons แทน emoji → modern และ scalable

แต่ละเมนูมี สี badge เฉพาะ
(Dashboard = Indigo, Add = Emerald, Expenses = Sky, Recurring = Violet, Settings = Amber)

Navigation รองรับ Desktop (Sidebar) + Mobile (Dropdown + Home option)

Landing Page

เมนูแบบการ์ดสีขาว + icon badge สี

Subtitle อธิบายแต่ละเมนู

ปุ่ม Home บน mobile dropdown กลับ Landing ได้

Settings

UI ใหม่ ใช้ง่ายขึ้น

Popup แจ้งผลการบันทึกสำเร็จ

รองรับการเลือกภาษา (ไทย/อังกฤษ)

Fix & UX Improvements

ข้อความไม่ติด Dynamic Island

สีข้อความบนการ์ดชัดเจน (พื้นขาว = ตัวอักษรเข้ม)

unify ชื่อโปรแกรม → “Expense Tracker” ตลอดทั้งแอป

🛠 Tech Stack

Frontend: React 18 + Vite

UI: TailwindCSS + Lucide Icons

State Management: React Context (app-state)

Storage: LocalStorage (SQLite via sql.js วางแผนภายหลัง)

Build/Deploy: Vite + PWA support

src/
 ├─ app/
 │   ├─ App.jsx          # Entry ของแอป
 │   ├─ Shell.jsx        # Layout + Navigation
 │   ├─ Landing.jsx      # หน้า Main Menu
 │   └─ ...
 ├─ features/
 │   ├─ Dashboard.jsx
 │   ├─ AddExpense.jsx
 │   ├─ Expenses.jsx
 │   ├─ Recurring.jsx
 │   └─ Settings.jsx
 ├─ data/
 │   ├─ app-state.jsx    # Context สำหรับ state หลัก
 │   └─ engine.js        # Storage engine (LocalStorage + SQLite ภายหลัง)
 └─ index.css            # Global styles & theme

🚧 Roadmap

 SQLite migration จาก LocalStorage
 Gamification (Streak, Badge, Tree Growth)
 Gamification (Pet/Tamagotchi optional)
 Export/Import CSV & รายงานขั้นสูง
 PWA polish (icon, splash screen, offline support)
 Theming/Custom color

 History

2025-08-XX: ปรับธีม Navy + White, Safe-area iPhone, ปิด zoom

2025-08-XX: อัปเดตโลโก้ + Branding ใหม่, ชื่อแอปเป็น “Expense Tracker”

2025-08-XX: เพิ่ม Lucide Icons + สี badge เมนู

2025-08-XX: ปรับ Landing page → การ์ดสีขาว + subtitle

2025-08-XX: Settings → Popup แจ้งผลบันทึก, รองรับภาษาไทย/อังกฤษ

2025-08-XX: unify Title Landing/Shell → Expense Tracker

2025-08-XX: อัปเดต README รวม Overview + Log + Roadmap
```

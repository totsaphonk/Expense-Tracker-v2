# Expense Tracker V2 🚀

โปรเจกต์นี้เป็นระบบบันทึกค่าใช้จ่ายรายเดือน (เวอร์ชัน 2)
สร้างขึ้นใหม่บน **React + Vite + TailwindCSS** โดยมีการปรับโครงสร้างและฟีเจอร์เพิ่มเติมจากเวอร์ชันแรก

---

## 📌 ฟีเจอร์หลัก (ปัจจุบัน)

- Dashboard — แสดงสรุปภาพรวมรายจ่าย
- Add Expense — เพิ่มรายการค่าใช้จ่ายใหม่
- Expenses — ดูและค้นหารายการค่าใช้จ่ายย้อนหลัง
- Recurring — จัดการค่าใช้จ่ายประจำ
- Settings — ตั้งค่ารอบตัดงบ, หมวดหมู่, ภาษา, backup/restore JSON

---

## 🎨 การปรับปรุงล่าสุด (Version 2)

1. **ธีมใหม่**

   - เปลี่ยนพื้นหลังเป็นโทน **น้ำเงินเข้ม (dark navy)** ตัดกับการ์ดสีขาว
   - ปรับตัวอักษรให้อ่านง่ายขึ้น (พื้นเข้ม = ข้อความสีขาว, พื้นการ์ดขาว = ข้อความสีเข้ม)
   - ใช้ safe-area สำหรับ iPhone (Dynamic Island / Notch)

2. **โลโก้และแบรนด์**

   - ใช้โลโก้ใหม่ (กระเป๋าเงิน + แว่นขยาย + กราฟ, น้ำเงิน–ขาว)
   - ชื่อแอปเปลี่ยนเป็น **Expense Tracker**
   - ขยายโลโก้ให้ใหญ่ขึ้นใน Header เพื่อความโดดเด่น

3. **การออกแบบเมนู**

   - ใช้ **Lucide Icons** แทน emoji → ดู modern และ scalable
   - แต่ละเมนูมี **สี badge** เฉพาะ (Dashboard = Indigo, Add = Emerald, Expenses = Sky, Recurring = Violet, Settings = Amber)
   - Navigation รองรับ Desktop (Sidebar) + Mobile (Dropdown + Home option)

4. **Landing Page**

   - หน้า Main Menu แสดงเมนูเป็นการ์ดสีขาว มี icon badge สี
   - ข้อความอธิบายแต่ละเมนู + subtitle
   - กด Home จาก dropdown มือถือเพื่อกลับ Landing ได้

5. **Settings**

   - ปรับ UI ให้สวยขึ้น
   - เพิ่ม Popup แจ้งเมื่อบันทึกข้อมูลสำเร็จ
   - รองรับการเลือกภาษา (ไทย/อังกฤษ)

6. **Fix & UX Improvements**
   - ปรับการแสดงผลบน iPhone: ปิดการซูม, ข้อความไม่ติด Dynamic Island
   - จัดการสีข้อความไม่ให้หายบนการ์ดพื้นขาว
   - unify ชื่อแอประหว่าง Landing / Shell → แสดง “Expense Tracker” ตลอด
   - Navigation Home option บนมือถือกลับสู่หน้าแรกได้

---

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite
- **UI**: TailwindCSS + Lucide React Icons
- **State Management**: React Context (`app-state`)
- **Storage**: LocalStorage (SQLite via sql.js จะมาทีหลัง)
- **Build/Deploy**: Vite + PWA support

---

## 🚧 Roadmap

- [ ] Challenge & Gamification (Streak, Badge, Tree Growth)
- [ ] SQLite (sql.js) migration จาก LocalStorage
- [ ] Export/Import CSV & รายงานขั้นสูง
- [ ] Theming / Custom Color
- [ ] Mobile PWA polish (icon, splash screen)

---

## ⚡ การเริ่มใช้งาน

```bash
npm install
npm run dev

โครงสร้างไฟล์สำคัญ
src/
 ├─ app/
 │   ├─ App.jsx          # Entry ของแอป
 │   ├─ Shell.jsx        # Layout เมนู/โครงร่างหลัก
 │   ├─ Landing.jsx      # หน้า Main Menu
 │   └─ ...
 ├─ features/
 │   ├─ Dashboard.jsx
 │   ├─ AddExpense.jsx
 │   ├─ Expenses.jsx
 │   ├─ Recurring.jsx
 │   └─ Settings.jsx
 ├─ data/
 │   ├─ app-state.jsx    # Context เก็บ state หลัก
 │   └─ engine.js        # Storage engine (LocalStorage + SQLite ภายหลัง)
 └─ index.css            # Theme & Global style
```

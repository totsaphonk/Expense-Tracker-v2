// src/app/Landing.jsx
import React from "react";

export default function Landing({ tabs, onPick, title }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b safe-top">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-semibold">
            ฿
          </div>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">เมนู</h2>
          <p className="text-gray-500 text-sm">
            เลือกเมนูที่ต้องการเริ่มใช้งาน (สามารถเปลี่ยนได้ภายหลัง)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => onPick(t.k)}
              className="group text-left rounded-2xl border bg-white hover:shadow-lg transition-all p-5 flex items-start gap-4"
            >
              <div className="text-3xl leading-none">{t.icon}</div>
              <div>
                <div className="font-semibold group-hover:underline">
                  {t.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {/* คำอธิบายสั้น ๆ ต่อเมนู (ตัวอย่าง) */}
                  {descFor(t.k)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function descFor(key) {
  switch (key) {
    case "dashboard":
      return "สรุปภาพรวมงบและการใช้จ่ายในรอบนี้";
    case "add":
      return "เพิ่มรายการใช้จ่ายใหม่อย่างรวดเร็ว";
    case "expenses":
      return "ดู/แก้ไข/ค้นหารายการทั้งหมด";
    case "recurring":
      return "ตั้งค่ารายการประจำ ให้ระบบสร้างให้อัตโนมัติ";
    case "reports":
      return "สรุปผลตามหมวด/ช่วงเวลา และ Export CSV";
    case "settings":
      return "ตั้งค่าวันตัดรอบ ภาษา และหมวดหมู่";
    default:
      return "";
  }
}

# Changelog  Expense Tracker v2

## 2025-08-23
- Base v2 structure (Vite + React), tabs UI.
- Features: Dashboard, AddExpense, Expenses, Reports (CSV export), Settings (cycle day, categories/budgets, backup/restore JSON), Recurring (manual + auto-apply on startup).
- LocalStorage-first engine with swap-ready API for SQLite (sql.js via npm) later.
- Disabled PWA for now (manifest to add later).
- Recharts used on Dashboard (install via `npm i recharts`).

## Next
- Polish Recurring (edit/update templates).
- SQLite (sql.js via npm) enablement + one-time migration from LocalStorage.
- PWA manifest + icons + offline cache strategy.

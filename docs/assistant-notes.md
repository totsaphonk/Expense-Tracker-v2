# Assistant Notes

**Repo:** https://github.com/totsaphonk/Expense-Tracker-v2  
**Timezone:** Asia/Bangkok  
**Language:** TH

## Architecture
- Vite + React. LocalStorage-first data engine (`getEngine()` abstraction).
- Future: switch to SQLite (sql.js via npm, with `public/sql-wasm.wasm`).
- PWA disabled for now (`virtual:pwa-register` commented).

## Implemented
- Dashboard, AddExpense, Expenses
- Reports: cycle/custom range, totals by category, CSV export
- Settings: cycle start day, categories & budgets, backup/restore JSON
- Recurring: template list, manual apply, **auto-apply on startup**

## Workflow
- User prefers **Thai** instructions & step-by-step.
- Changes delivered via **patch** or **full files** to paste.

## Conventions
- Keep hooks order stable in components.
- Avoid CDN for sql.js; use npm package later.
- Keep `engine.js` API stable for engine swap.

## Next ideas
- Recurring edit UI, color-picker for categories.
- Export/Import SQLite (.sqlite) once db enabled.
- PWA manifest + app icons.

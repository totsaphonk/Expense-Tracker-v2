// src/data/engine.js
// Data engine with SQLite (sql.js) + LocalStorage fallback.
// Exports: uid, startOfDay, addMonths, getCycleRange, getEngine

let _engine = null;

// ------------------------------------
// Storage keys (for LocalStorage + migration)
// ------------------------------------
const STORAGE_KEYS = {
  settings: "et_settings_v1",
  categories: "et_categories_v1",
  expenses: "et_expenses_v1",
  migrated: "et_migrated_to_sqlite_v1",
  recurrings: "et_recurrings_v1",
};

// ------------------------------------
// sql.js loader (resilient to CDN import shape)
// ------------------------------------
const SQLJS_VERSION = "1.10.2";
const SQLJS_URLS = [
  `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/sql-wasm.js/+esm`,
  `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/sql-wasm.js`,
];
const WASM_CDN_URL = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/sql-wasm.wasm`;
const WASM_LOCAL_URL = `/sql-wasm.wasm`;

// ------------------------------------
// Small utilities used across the app
// ------------------------------------
export function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) d.setDate(0); // clamp end-of-month
  return d;
}

export function getCycleRange(cycleStartDay, offsetFromCurrent = 0) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const candidateStart = new Date(y, m, cycleStartDay);
  const currentStart =
    today.getDate() >= cycleStartDay
      ? candidateStart
      : new Date(y, m - 1, cycleStartDay);

  const start = addMonths(currentStart, -offsetFromCurrent);
  const nextStart = addMonths(start, 1);
  const end = new Date(nextStart.getTime() - 1);

  return { start: startOfDay(start), end };
}

// ------------------------------------
// LocalStorage engine (fallback)
// ------------------------------------
const localEngine = {
  type: "local",
  async init() {},
  async loadSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "null");
  },
  async saveSettings(s) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s));
  },
  async loadCategories() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || "[]");
  },
  async saveCategories(arr) {
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(arr));
  },
  async loadExpenses() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses) || "[]");
  },
  async saveExpenses(arr) {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(arr));
  },
  async loadRecurrings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.recurrings) || "[]");
  },
  async saveRecurrings(arr) {
    localStorage.setItem(STORAGE_KEYS.recurrings, JSON.stringify(arr));
  },
  async migrateFromLocalIfNeeded() {}, // noop when already local
  exportBinary() {
    // not supported for local engine; return empty blob so callers don't crash
    return new Blob([], { type: "application/octet-stream" });
  },
};

// ------------------------------------
// Helpers to load sql.js
// ------------------------------------
function getWasmPathPreference() {
  if (typeof window !== "undefined" && window.__SQLJS_FORCE_LOCAL__)
    return WASM_LOCAL_URL;
  return WASM_CDN_URL;
}

async function loadSqlJsResilient() {
  let lastErr;
  for (const url of SQLJS_URLS) {
    try {
      const mod = await import(/* @vite-ignore */ url);
      const initSqlJs = mod?.default || mod;
      if (typeof initSqlJs !== "function")
        throw new Error("Invalid sql.js module shape");
      const SQL = await initSqlJs({ locateFile: () => getWasmPathPreference() });
      return SQL;
    } catch (e) {
      lastErr = e;
      console.warn("[sql.js] load failed at", url, e);
    }
  }
  throw lastErr;
}

// ------------------------------------
// SQLite (sql.js) engine
// ------------------------------------
async function makeSqliteEngine() {
  try {
    const SQL = await loadSqlJsResilient();
    const db = new SQL.Database();

    // Create tables (idempotent)
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        budget REAL NOT NULL DEFAULT 0,
        color TEXT
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        dateISO TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        k TEXT PRIMARY KEY,
        v TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recurrings (
        id TEXT PRIMARY KEY,
        categoryId TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        startISO TEXT NOT NULL,
        everyMonths INTEGER NOT NULL,
        occurrences INTEGER,
        untilISO TEXT,
        lastAppliedISO TEXT
      );
    `);

    const api = {
      type: "sqlite",
      async init() {},
      async loadSettings() {
        const res = db.exec("SELECT v FROM settings WHERE k='app'");
        if (!res[0]) return null;
        return JSON.parse(res[0].values[0][0]);
      },
      async saveSettings(s) {
        const json = JSON.stringify(s);
        db.run(
          "INSERT INTO settings(k,v) VALUES('app', $v) ON CONFLICT(k) DO UPDATE SET v=$v",
          { $v: json }
        );
      },

      async loadCategories() {
        const res = db.exec(
          "SELECT id,name,budget,COALESCE(color,'') FROM categories ORDER BY rowid DESC"
        );
        if (!res[0]) return [];
        return res[0].values.map(([id, name, budget, color]) => ({
          id,
          name,
          budget,
          color,
        }));
      },
      async saveCategories(arr) {
        db.run("DELETE FROM categories");
        const stmt = db.prepare(
          "INSERT INTO categories(id,name,budget,color) VALUES($id,$name,$budget,$color)"
        );
        db.run("BEGIN");
        try {
          arr.forEach((c) =>
            stmt.run({
              $id: c.id,
              $name: c.name,
              $budget: Number(c.budget) || 0,
              $color: c.color || "",
            })
          );
          db.run("COMMIT");
        } catch (e) {
          db.run("ROLLBACK");
          throw e;
        } finally {
          stmt.free();
        }
      },

      async loadExpenses() {
        const res = db.exec(
          "SELECT id,dateISO,categoryId,amount,note FROM expenses ORDER BY dateISO DESC, rowid DESC"
        );
        if (!res[0]) return [];
        return res[0].values.map(([id, dateISO, categoryId, amount, note]) => ({
          id,
          dateISO,
          categoryId,
          amount,
          note,
        }));
      },
      async saveExpenses(arr) {
        db.run("DELETE FROM expenses");
        const stmt = db.prepare(
          "INSERT INTO expenses(id,dateISO,categoryId,amount,note) VALUES($id,$d,$c,$a,$n)"
        );
        db.run("BEGIN");
        try {
          arr.forEach((e) =>
            stmt.run({
              $id: e.id,
              $d: e.dateISO,
              $c: e.categoryId,
              $a: Number(e.amount) || 0,
              $n: e.note || "",
            })
          );
          db.run("COMMIT");
        } catch (e) {
          db.run("ROLLBACK");
          throw e;
        } finally {
          stmt.free();
        }
      },

      async loadRecurrings() {
        const res = db.exec(
          "SELECT id,categoryId,amount,COALESCE(note,''),startISO,everyMonths,occurrences,untilISO,lastAppliedISO FROM recurrings ORDER BY rowid DESC"
        );
        if (!res[0]) return [];
        return res[0].values.map(
          ([
            id,
            categoryId,
            amount,
            note,
            startISO,
            everyMonths,
            occurrences,
            untilISO,
            lastAppliedISO,
          ]) => ({
            id,
            categoryId,
            amount,
            note,
            startISO,
            everyMonths,
            occurrences,
            untilISO,
            lastAppliedISO,
          })
        );
      },
      async saveRecurrings(arr) {
        db.run("DELETE FROM recurrings");
        const stmt = db.prepare(
          "INSERT INTO recurrings(id,categoryId,amount,note,startISO,everyMonths,occurrences,untilISO,lastAppliedISO) VALUES($id,$c,$a,$n,$s,$m,$o,$u,$l)"
        );
        db.run("BEGIN");
        try {
          arr.forEach((r) =>
            stmt.run({
              $id: r.id,
              $c: r.categoryId,
              $a: Number(r.amount) || 0,
              $n: r.note || "",
              $s: r.startISO,
              $m: parseInt(r.everyMonths) || 1,
              $o: r.occurrences == null ? null : parseInt(r.occurrences),
              $u: r.untilISO || null,
              $l: r.lastAppliedISO || null,
            })
          );
          db.run("COMMIT");
        } catch (e) {
          db.run("ROLLBACK");
          throw e;
        } finally {
          stmt.free();
        }
      },

      async migrateFromLocalIfNeeded() {
        if (localStorage.getItem(STORAGE_KEYS.migrated) === "1") return;
        const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "null");
        const c = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || "[]");
        const e = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses) || "[]");
        const r = JSON.parse(localStorage.getItem(STORAGE_KEYS.recurrings) || "[]");

        if (s) await api.saveSettings(s);
        if (c.length) await api.saveCategories(c);
        if (e.length) await api.saveExpenses(e);
        if (r.length) await api.saveRecurrings(r);

        localStorage.setItem(STORAGE_KEYS.migrated, "1");
      },

      exportBinary() {
        const data = db.export();
        return new Blob([data], { type: "application/octet-stream" });
      },
    };

    return api;
  } catch (err) {
    console.warn("SQLite WASM not available, fallback to LocalStorage", err);
    return localEngine;
  }
}

// ------------------------------------
// Public API for the rest of the app
// ------------------------------------
export async function getEngine() {
  if (_engine) return _engine;
  _engine = await makeSqliteEngine();
  await _engine.init?.();
  return _engine;
}

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "app.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    goal TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    height_cm REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS nutrition_goals (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    goals_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS food_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date TEXT NOT NULL,
    source TEXT NOT NULL,
    description TEXT,
    image_path TEXT,
    nutrients_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, entry_date)`,
];

for (const sql of migrations) {
  db.exec(sql);
}

/** One-time data fixes for existing installs */
try {
  db.exec(`UPDATE users SET goal = 'strength' WHERE goal = 'powerlifter'`);
  db.exec(`UPDATE users SET goal = 'general' WHERE goal = 'regular'`);
} catch {
  /* ignore */
}

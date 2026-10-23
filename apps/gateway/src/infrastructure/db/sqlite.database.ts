import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;
  const dbPath = config.dbPath === ":memory:" ? config.dbPath : path.resolve(config.dbPath);
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  dbInstance = db;
  return db;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','viewer')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      model TEXT,
      username TEXT NOT NULL,
      password_enc TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'hd',
      rtsp_path TEXT NOT NULL DEFAULT '/stream1',
      enabled INTEGER NOT NULL DEFAULT 1,
      ptz_supported INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

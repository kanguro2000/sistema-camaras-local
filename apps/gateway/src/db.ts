import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

export type Db = DatabaseSync;

let dbInstance: Db | null = null;

export function getDb(): Db {
  if (dbInstance) return dbInstance;
  const dir = path.dirname(path.resolve(config.dbPath));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.resolve(config.dbPath));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  seedAdmin(db);
  dbInstance = db;
  return db;
}

function migrate(db: Db) {
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

function seedAdmin(db: Db) {
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get() as unknown as { c: number };
  if (row.c > 0) return;
  const password = process.env.ADMIN_PASSWORD ?? "admin";
  if (password === "admin") {
    console.warn("[db] Seeding default admin user with password 'admin'. Change ADMIN_PASSWORD in production.");
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?,?,?,?,?)",
  ).run(crypto.randomUUID(), "admin", hash, "admin", new Date().toISOString());
}

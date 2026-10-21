import { getDb } from "../db.js";
import { encrypt, decrypt } from "../crypto.js";
import { CameraCreate, CameraUpdate } from "@sistema-camaras/shared";
import crypto from "node:crypto";

export interface CameraRow {
  id: string;
  name: string;
  ip: string;
  model: string | null;
  username: string;
  password_enc: string;
  channel: "hd" | "sd";
  rtsp_path: string;
  enabled: number;
  ptz_supported: number;
  created_at: string;
  updated_at: string;
}

export interface CameraDto {
  id: string;
  name: string;
  ip: string;
  model?: string;
  username: string;
  hasCredentials: true;
  channel: "hd" | "sd";
  rtspPath: string;
  enabled: boolean;
  ptzSupported: boolean;
  createdAt: string;
  updatedAt: string;
}

function rowToDto(row: CameraRow): CameraDto {
  return {
    id: row.id,
    name: row.name,
    ip: row.ip,
    model: row.model ?? undefined,
    username: row.username,
    hasCredentials: true,
    channel: row.channel,
    rtspPath: row.rtsp_path,
    enabled: Boolean(row.enabled),
    ptzSupported: Boolean(row.ptz_supported),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCameras(): CameraDto[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM cameras ORDER BY created_at DESC").all() as unknown as CameraRow[];
  return rows.map(rowToDto);
}

export function getCamera(id: string): CameraDto | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id) as unknown as CameraRow | undefined;
  return row ? rowToDto(row) : null;
}

export function getCameraWithSecret(id: string): { dto: CameraDto; username: string; password: string } | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id) as unknown as CameraRow | undefined;
  if (!row) return null;
  return { dto: rowToDto(row), username: row.username, password: decrypt(row.password_enc) };
}

export function createCamera(input: CameraCreate): CameraDto {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const enc = encrypt(input.password);
  db.prepare(
    `INSERT INTO cameras (id, name, ip, model, username, password_enc, channel, rtsp_path, enabled, ptz_supported, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    input.name,
    input.ip,
    input.model ?? null,
    input.username,
    enc,
    input.channel,
    "/stream1",
    input.enabled ? 1 : 0,
    0,
    now,
    now,
  );
  return getCamera(id)!;
}

export function updateCamera(id: string, input: CameraUpdate): CameraDto | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id) as CameraRow | undefined;
  if (!existing) return null;
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (input.name !== undefined) { fields.push("name = ?"); values.push(input.name); }
  if (input.ip !== undefined) { fields.push("ip = ?"); values.push(input.ip); }
  if (input.model !== undefined) { fields.push("model = ?"); values.push(input.model ?? null); }
  if (input.username !== undefined) { fields.push("username = ?"); values.push(input.username); }
  if (input.password !== undefined) { fields.push("password_enc = ?"); values.push(encrypt(input.password)); }
  if (input.channel !== undefined) { fields.push("channel = ?"); values.push(input.channel); }
  if (input.enabled !== undefined) { fields.push("enabled = ?"); values.push(input.enabled ? 1 : 0); }
  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);
  db.prepare(`UPDATE cameras SET ${fields.join(", ")} WHERE id = ?`).run(...(values as any));
  return getCamera(id);
}

export function deleteCamera(id: string): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM cameras WHERE id = ?").run(id);
  return info.changes > 0;
}

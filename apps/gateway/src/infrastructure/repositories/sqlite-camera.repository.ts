import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { getDatabase } from "../db/sqlite.database.js";
import { encrypt, decrypt } from "../security/crypto.service.js";
import { Camera, CameraCreateInput, CameraUpdateInput } from "../../domain/entities/camera.js";
import { CameraRepository } from "../../domain/repositories/camera.repository.js";

interface CameraRow {
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

function rowToCamera(row: CameraRow): Camera {
  return {
    id: row.id,
    name: row.name,
    ip: row.ip,
    model: row.model ?? undefined,
    hasCredentials: true,
    channel: row.channel,
    rtspPath: row.rtsp_path,
    enabled: Boolean(row.enabled),
    ptzSupported: Boolean(row.ptz_supported),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteCameraRepository implements CameraRepository {
  private db: DatabaseSync;

  constructor() {
    this.db = getDatabase();
  }

  list(): Camera[] {
    const rows = this.db.prepare("SELECT * FROM cameras ORDER BY created_at DESC").all() as unknown as CameraRow[];
    return rows.map(rowToCamera);
  }

  getById(id: string): Camera | null {
    const row = this.db.prepare("SELECT * FROM cameras WHERE id = ?").get(id) as unknown as CameraRow | undefined;
    return row ? rowToCamera(row) : null;
  }

  getWithSecret(id: string) {
    const row = this.db.prepare("SELECT * FROM cameras WHERE id = ?").get(id) as unknown as CameraRow | undefined;
    if (!row) return null;
    return { camera: rowToCamera(row), username: row.username, password: decrypt(row.password_enc) };
  }

  create(input: CameraCreateInput): Camera {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const enc = encrypt(input.password);
    this.db.prepare(
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
    return this.getById(id)!;
  }

  update(id: string, input: CameraUpdateInput): Camera | null {
    const existing = this.db.prepare("SELECT * FROM cameras WHERE id = ?").get(id) as unknown as CameraRow | undefined;
    if (!existing) return null;
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
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
    this.db.prepare(`UPDATE cameras SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const info = this.db.prepare("DELETE FROM cameras WHERE id = ?").run(id);
    return info.changes > 0;
  }
}

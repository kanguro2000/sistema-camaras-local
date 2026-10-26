import type { DatabaseSync } from "node:sqlite";
import type { AuthenticatedUser } from "../../domain/services/access-token-service.js";
import type { RefreshSessionRepository } from "../../domain/repositories/refresh-session.repository.js";
import { getDatabase } from "../db/sqlite.database.js";

interface RefreshSessionRow {
  session_id: string;
  user_id: string;
  username: string;
  role: "admin" | "viewer";
  expires_at: number;
  consumed_at: number | null;
}

export class SqliteRefreshSessionRepository implements RefreshSessionRepository {
  constructor(private readonly db: DatabaseSync = getDatabase()) {}

  create(tokenHash: string, sessionId: string, user: AuthenticatedUser, expiresAt: number): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM refresh_sessions WHERE expires_at <= ?").run(Date.now());
      this.db.prepare(
        "INSERT INTO refresh_sessions (session_id, user_id, username, role, expires_at) VALUES (?, ?, ?, ?, ?)",
      ).run(sessionId, user.sub, user.username, user.role, expiresAt);
      this.db.prepare(
        "INSERT INTO refresh_tokens (token_hash, session_id) VALUES (?, ?)",
      ).run(tokenHash, sessionId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  rotate(
    tokenHash: string,
    nextTokenHash: string,
    nextExpiresAt: number,
    now: number,
  ): AuthenticatedUser | null {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare(`
        SELECT s.session_id, s.user_id, s.username, s.role, s.expires_at, t.consumed_at
        FROM refresh_tokens t
        JOIN refresh_sessions s ON s.session_id = t.session_id
        WHERE t.token_hash = ?
      `).get(tokenHash) as unknown as RefreshSessionRow | undefined;

      if (!row) {
        this.db.exec("COMMIT");
        return null;
      }

      if (row.consumed_at !== null || row.expires_at <= now) {
        this.db.prepare("DELETE FROM refresh_sessions WHERE session_id = ?").run(row.session_id);
        this.db.exec("COMMIT");
        return null;
      }

      this.db.prepare(
        "UPDATE refresh_tokens SET consumed_at = ? WHERE token_hash = ? AND consumed_at IS NULL",
      ).run(now, tokenHash);
      this.db.prepare(
        "INSERT INTO refresh_tokens (token_hash, session_id) VALUES (?, ?)",
      ).run(nextTokenHash, row.session_id);
      this.db.prepare(
        "UPDATE refresh_sessions SET expires_at = ? WHERE session_id = ?",
      ).run(nextExpiresAt, row.session_id);
      this.db.exec("COMMIT");
      return { sub: row.user_id, username: row.username, role: row.role };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  revoke(tokenHash: string): void {
    this.db.prepare(`
      DELETE FROM refresh_sessions
      WHERE session_id = (
        SELECT session_id FROM refresh_tokens WHERE token_hash = ?
      )
    `).run(tokenHash);
  }
}

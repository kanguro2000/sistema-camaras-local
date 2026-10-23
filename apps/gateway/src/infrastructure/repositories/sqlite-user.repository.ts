import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { getDatabase } from "../db/sqlite.database.js";
import { User } from "../../domain/entities/user.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { config } from "../../config.js";

export class SqliteUserRepository implements UserRepository {
  private db: DatabaseSync;

  constructor() {
    this.db = getDatabase();
    this.seedAdmin();
  }

  private seedAdmin() {
    const row = this.db.prepare("SELECT COUNT(*) as c FROM users").get() as unknown as { c: number };
    if (row.c > 0) return;
    const password = config.adminPassword;
    if (!password || password.length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters when initializing the admin user");
    }
    const hash = bcrypt.hashSync(password, 12);
    const id = crypto.randomUUID();
    this.db.prepare(
      "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?,?,?,?,?)",
    ).run(id, "admin", hash, "admin", new Date().toISOString());
  }

  findByUsername(username: string) {
    const row = this.db
      .prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")
      .get(username) as unknown as { id: string; username: string; password_hash: string; role: "admin" | "viewer" } | undefined;
    if (!row) return null;
    return { id: row.id, username: row.username, passwordHash: row.password_hash, role: row.role };
  }

  count() {
    const row = this.db.prepare("SELECT COUNT(*) as c FROM users").get() as unknown as { c: number };
    return row.c;
  }

  create(username: string, passwordHash: string, role: "admin" | "viewer"): User {
    const id = crypto.randomUUID();
    this.db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?,?,?,?,?)").run(
      id,
      username,
      passwordHash,
      role,
      new Date().toISOString(),
    );
    return { id, username, role };
  }
}

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb } from "./db.js";
import { config } from "./config.js";

export interface JwtPayload {
  sub: string;
  username: string;
  role: "admin" | "viewer";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "15m" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export function authenticateUser(username: string, password: string): JwtPayload | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")
    .get(username) as { id: string; username: string; password_hash: string; role: "admin" | "viewer" } | undefined;
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return { sub: row.id, username: row.username, role: row.role };
}

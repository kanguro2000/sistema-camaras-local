import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { config } from "../../config.js";

export interface AuthResult {
  accessToken: string;
  user: { id: string; username: string; role: "admin" | "viewer" };
}

export class AuthService {
  constructor(private users: UserRepository) {}

  login(username: string, password: string): AuthResult | null {
    const u = this.users.findByUsername(username);
    if (!u) return null;
    if (!bcrypt.compareSync(password, u.passwordHash)) return null;
    const token = jwt.sign(
      { sub: u.id, username: u.username, role: u.role },
      config.jwtSecret,
      { expiresIn: "15m" },
    );
    return { accessToken: token, user: { id: u.id, username: u.username, role: u.role } };
  }
}

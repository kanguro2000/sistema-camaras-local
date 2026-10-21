import { User } from "../entities/user.js";

export interface UserRepository {
  findByUsername(username: string): { id: string; username: string; passwordHash: string; role: "admin" | "viewer" } | null;
  count(): number;
  create(username: string, passwordHash: string, role: "admin" | "viewer"): User;
}

import { User } from "../entities/user.js";

export interface AuthenticatedUser {
  sub: string;
  username: string;
  role: User["role"];
}

export interface AccessTokenService {
  issue(user: AuthenticatedUser): string;
  verify(token: string): AuthenticatedUser | null;
}

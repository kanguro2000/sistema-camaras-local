import type { AuthenticatedUser } from "./access-token-service.js";

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface RefreshTokenService {
  issue(user: AuthenticatedUser): string;
  rotate(token: string | null): { token: string; user: AuthenticatedUser } | null;
  revoke(token: string | null): void;
}

import type { AuthenticatedUser } from "../services/access-token-service.js";

export interface RefreshSessionRepository {
  create(tokenHash: string, sessionId: string, user: AuthenticatedUser, expiresAt: number): void;
  rotate(
    tokenHash: string,
    nextTokenHash: string,
    nextExpiresAt: number,
    now: number,
  ): AuthenticatedUser | null;
  revoke(tokenHash: string): void;
}

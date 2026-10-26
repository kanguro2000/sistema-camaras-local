import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../../domain/services/access-token-service.js";
import {
  REFRESH_TOKEN_TTL_MS,
  type RefreshTokenService,
} from "../../domain/services/refresh-token-service.js";
import type { RefreshSessionRepository } from "../../domain/repositories/refresh-session.repository.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class OpaqueRefreshTokenService implements RefreshTokenService {
  constructor(
    private readonly sessions: RefreshSessionRepository,
    private readonly now: () => number = Date.now,
  ) {}

  issue(user: AuthenticatedUser): string {
    const token = randomBytes(32).toString("base64url");
    this.sessions.create(
      hashToken(token),
      randomUUID(),
      user,
      this.now() + REFRESH_TOKEN_TTL_MS,
    );
    return token;
  }

  rotate(token: string | null): { token: string; user: AuthenticatedUser } | null {
    if (!token) return null;
    const nextToken = randomBytes(32).toString("base64url");
    const now = this.now();
    const user = this.sessions.rotate(
      hashToken(token),
      hashToken(nextToken),
      now + REFRESH_TOKEN_TTL_MS,
      now,
    );
    return user ? { token: nextToken, user } : null;
  }

  revoke(token: string | null): void {
    if (token) this.sessions.revoke(hashToken(token));
  }
}

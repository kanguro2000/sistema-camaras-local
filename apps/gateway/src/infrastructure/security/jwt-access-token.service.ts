import jwt from "jsonwebtoken";
import { z } from "zod";
import { AccessTokenService, AuthenticatedUser } from "../../domain/services/access-token-service.js";

const AccessTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(["admin", "viewer"]),
});

export class JwtAccessTokenService implements AccessTokenService {
  constructor(private readonly secret: string) {}

  issue(user: AuthenticatedUser): string {
    return jwt.sign(
      { sub: user.sub, username: user.username, role: user.role },
      this.secret,
      { expiresIn: "15m" },
    );
  }

  verify(token: string): AuthenticatedUser | null {
    try {
      const payload = jwt.verify(token, this.secret);
      const parsed = AccessTokenClaimsSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}

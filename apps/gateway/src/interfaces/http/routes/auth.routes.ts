import { FastifyInstance } from "fastify";
import { LoginSchema } from "@sistema-camaras/shared";
import { AuthService } from "../../../application/services/auth.service.js";
import { requireAuth } from "../guards/auth.guard.js";
import {
  clearRefreshTokenCookie,
  readRefreshToken,
  refreshTokenCookie,
} from "../guards/refresh-token-cookie.js";

export function authRoutesFactory(auth: AuthService) {
  return async function authRoutes(app: FastifyInstance) {
    app.get("/api/auth/me", { preHandler: requireAuth(auth) }, async (req, reply) => {
      if (!req.user) {
        return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing user identity" } });
      }
      return { id: req.user.sub, username: req.user.username, role: req.user.role };
    });

    app.post(
      "/api/auth/login",
      { config: { rateLimit: { max: 5, timeWindow: 60_000 } } },
      async (req, reply) => {
        const parsed = LoginSchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten() } });
        }
        const result = await auth.login(parsed.data.username, parsed.data.password);
        if (!result) {
          return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
        }
        reply.header("Cache-Control", "no-store");
        reply.header(
          "Set-Cookie",
          refreshTokenCookie(result.refreshToken, req.protocol === "https"),
        );
        return reply.send({ accessToken: result.accessToken, user: result.user });
      },
    );

    app.post(
      "/api/auth/refresh",
      { config: { rateLimit: { max: 30, timeWindow: 60_000 } } },
      async (req, reply) => {
        reply.header("Cache-Control", "no-store");
        const result = auth.refresh(readRefreshToken(req.headers.cookie));
        if (!result) {
          reply.header(
            "Set-Cookie",
            clearRefreshTokenCookie(req.protocol === "https"),
          );
          return reply.code(401).send({
            error: { code: "UNAUTHORIZED", message: "Refresh token is invalid or expired" },
          });
        }
        reply.header(
          "Set-Cookie",
          refreshTokenCookie(result.refreshToken, req.protocol === "https"),
        );
        return { accessToken: result.accessToken };
      },
    );

    app.post("/api/auth/logout", async (req, reply) => {
      auth.logout(readRefreshToken(req.headers.cookie));
      reply.header(
        "Set-Cookie",
        clearRefreshTokenCookie(req.protocol === "https"),
      );
      reply.header("Cache-Control", "no-store");
      return reply.code(204).send();
    });
  };
}

import { FastifyInstance } from "fastify";
import { LoginSchema } from "@sistema-camaras/shared";
import { AuthService } from "../../../application/services/auth.service.js";

export function authRoutesFactory(auth: AuthService) {
  return async function authRoutes(app: FastifyInstance) {
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
        return reply.send({ accessToken: result.accessToken, user: result.user });
      },
    );
  };
}

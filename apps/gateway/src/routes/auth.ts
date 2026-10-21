import { FastifyInstance } from "fastify";
import { LoginSchema } from "@sistema-camaras/shared";
import { authenticateUser, signToken } from "../auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten() } });
    }
    const payload = authenticateUser(parsed.data.username, parsed.data.password);
    if (!payload) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
    }
    const accessToken = signToken(payload);
    return reply.send({ accessToken, user: { id: payload.sub, username: payload.username, role: payload.role } });
  });
}

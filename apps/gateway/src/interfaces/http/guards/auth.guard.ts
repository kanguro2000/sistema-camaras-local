import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../../../config.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { sub: string; username: string; role: "admin" | "viewer" };
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as any;
    req.user = { sub: payload.sub, username: payload.username, role: payload.role };
  } catch {
    return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
  }
}

export function requireRole(role: "admin" | "viewer") {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply);
    if (reply.sent) return;
    const order = { viewer: 0, admin: 1 };
    if (order[req.user!.role] < order[role]) {
      return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Insufficient role" } });
    }
  };
}

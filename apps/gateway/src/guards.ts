import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken, JwtPayload } from "./auth.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
  }
  try {
    req.user = verifyToken(header.slice(7));
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

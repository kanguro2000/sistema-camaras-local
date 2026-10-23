import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../../../application/services/auth.service.js";
import { AuthenticatedUser } from "../../../domain/services/access-token-service.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export function requireAuth(auth: AuthService) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
    }

    const user = auth.authenticate(header.slice(7));
    if (!user) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
    }
    req.user = user;
  };
}

export function requireRole(auth: AuthService, role: "admin" | "viewer") {
  const authenticate = requireAuth(auth);
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await authenticate(req, reply);
    if (reply.sent || !req.user) return;

    const order = { viewer: 0, admin: 1 };
    if (order[req.user.role] < order[role]) {
      return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Insufficient role" } });
    }
  };
}

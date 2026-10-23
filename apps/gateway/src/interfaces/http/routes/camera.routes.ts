import { FastifyInstance } from "fastify";
import { CameraCreateSchema, CameraUpdateSchema } from "@sistema-camaras/shared";
import { AuthService } from "../../../application/services/auth.service.js";
import { CameraService } from "../../../application/services/camera.service.js";
import { CameraStreamService } from "../../../application/services/camera-stream.service.js";
import { StreamTicketService } from "../../../domain/services/stream-ticket-service.js";
import { requireAuth, requireRole } from "../guards/auth.guard.js";
import { streamTicketCookie } from "../guards/stream-ticket.guard.js";

export function cameraRoutesFactory(
  service: CameraService,
  auth: AuthService,
  streamTickets: StreamTicketService,
  streams: CameraStreamService,
) {
  const authenticate = requireAuth(auth);
  return async function cameraRoutes(app: FastifyInstance) {
    app.get("/api/cameras", { preHandler: authenticate }, async () => ({ items: service.list() }));

    app.get("/api/cameras/:id", { preHandler: authenticate }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const cam = service.get(id);
      if (!cam) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      return cam;
    });

    app.post("/api/cameras", { preHandler: requireRole(auth, "admin") }, async (req, reply) => {
      const parsed = CameraCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten() } });
      }
      const cam = service.create(parsed.data);
      return reply.code(201).send(cam);
    });

    app.patch("/api/cameras/:id", { preHandler: requireRole(auth, "admin") }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.get(id)) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      }
      const parsed = CameraUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten() } });
      }
      const cam = service.update(id, parsed.data);
      return cam;
    });

    app.delete("/api/cameras/:id", { preHandler: requireRole(auth, "admin") }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.delete(id)) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      }
      return reply.code(204).send();
    });

    app.post("/api/cameras/:id/probe", { preHandler: requireRole(auth, "admin") }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.get(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      const result = await service.probe(id);
      return result;
    });

    app.get("/api/cameras/:id/health", { preHandler: authenticate }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.get(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      return streams.health(id);
    });

    app.get("/api/cameras/:id/stream", { preHandler: authenticate }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const stream = await streams.start(id);
      if (!stream) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      if (!req.user) return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Missing user identity" } });
      const ticket = streamTickets.issue(req.user.sub, id);
      reply.header("Set-Cookie", streamTicketCookie(ticket, id, req.protocol === "https"));
      reply.header("Cache-Control", "no-store");
      return {
        hlsUrl: `/streams/${id}/index.m3u8`,
        health: stream.health,
      };
    });

    app.post("/api/cameras/:id/stream/stop", { preHandler: requireRole(auth, "admin") }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.get(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      streams.stop(id);
      return { status: "stopped" };
    });
  };
}

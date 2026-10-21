import { FastifyInstance } from "fastify";
import { CameraCreateSchema, CameraUpdateSchema } from "@sistema-camaras/shared";
import { CameraService } from "../../../application/services/camera.service.js";
import { streamManager } from "../../../infrastructure/media/stream-manager.js";
import { requireAuth, requireRole } from "../guards/auth.guard.js";
import { config } from "../../../config.js";

export function cameraRoutesFactory(service: CameraService) {
  return async function cameraRoutes(app: FastifyInstance) {
    app.get("/api/cameras", { preHandler: requireAuth }, async () => ({ items: service.list() }));

    app.get("/api/cameras/:id", { preHandler: requireAuth }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const cam = service.get(id);
      if (!cam) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      return cam;
    });

    app.post("/api/cameras", { preHandler: requireRole("admin") }, async (req, reply) => {
      const parsed = CameraCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten() } });
      }
      const cam = service.create(parsed.data);
      return reply.code(201).send(cam);
    });

    app.patch("/api/cameras/:id", { preHandler: requireRole("admin") }, async (req, reply) => {
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

    app.delete("/api/cameras/:id", { preHandler: requireRole("admin") }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.delete(id)) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      }
      return reply.code(204).send();
    });

    app.post("/api/cameras/:id/probe", { preHandler: requireRole("admin") }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.get(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      const result = await service.probe(id);
      return result;
    });

    app.get("/api/cameras/:id/health", { preHandler: requireAuth }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.get(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      return streamManager.health(id);
    });

    app.get("/api/cameras/:id/stream", { preHandler: requireAuth }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const cam = service.get(id);
      if (!cam) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      const secret = service.getWithSecret(id)!;
      const streamPath = secret.camera.channel === "sd" ? "/stream2" : "/stream1";
      const rtspUrl = `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.camera.ip}:554${streamPath}`;
      await streamManager.ensureRunning(id, rtspUrl);
      const base = `${req.protocol}://${req.headers.host}`;
      return {
        hlsUrl: `${base}/streams/${id}/index.m3u8`,
        health: streamManager.health(id),
      };
    });

    app.post("/api/cameras/:id/stream/stop", { preHandler: requireRole("admin") }, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!service.get(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      streamManager.stop(id);
      return { status: "stopped" };
    });
  };
}

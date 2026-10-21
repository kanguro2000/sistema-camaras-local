import { FastifyInstance } from "fastify";
import { CameraCreateSchema, CameraUpdateSchema } from "@sistema-camaras/shared";
import {
  listCameras,
  getCamera,
  createCamera,
  updateCamera,
  deleteCamera,
  getCameraWithSecret,
} from "../repositories/cameras.js";
import { requireAuth, requireRole } from "../guards.js";
import { streamManager } from "../media/stream-manager.js";
import { config } from "../config.js";
import { probeCamera } from "../media/probe.js";

export async function cameraRoutes(app: FastifyInstance) {
  app.get("/api/cameras", { preHandler: requireAuth }, async () => ({ items: listCameras() }));

  app.get("/api/cameras/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const cam = getCamera(id);
    if (!cam) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    return cam;
  });

  app.post("/api/cameras", { preHandler: requireRole("admin") }, async (req, reply) => {
    const parsed = CameraCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten() } });
    }
    const cam = createCamera(parsed.data);
    return reply.code(201).send(cam);
  });

  app.patch("/api/cameras/:id", { preHandler: requireRole("admin") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getCamera(id)) {
      return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    }
    const parsed = CameraUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.flatten() } });
    }
    const cam = updateCamera(id, parsed.data);
    return cam;
  });

  app.delete("/api/cameras/:id", { preHandler: requireRole("admin") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!deleteCamera(id)) {
      return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    }
    return reply.code(204).send();
  });

  app.post("/api/cameras/:id/probe", { preHandler: requireRole("admin") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getCamera(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    const result = await probeCamera(id);
    return result;
  });

  app.get("/api/cameras/:id/health", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getCamera(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    return streamManager.health(id);
  });

  app.get("/api/cameras/:id/stream", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getCamera(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    await streamManager.ensureRunning(id);
    const base = `${req.protocol}://${req.headers.host}`;
    return {
      hlsUrl: `${base}/streams/${id}/index.m3u8`,
      health: streamManager.health(id),
    };
  });

  app.post("/api/cameras/:id/stream/stop", { preHandler: requireRole("admin") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getCamera(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    streamManager.stop(id);
    return { status: "stopped" };
  });
}

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

  // Probe placeholder (connectivity check) - to be implemented with RTSP
  app.post("/api/cameras/:id/probe", { preHandler: requireRole("admin") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const secret = getCameraWithSecret(id);
    if (!secret) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    // TODO: real RTSP probe. For now report configured.
    return { status: "configured", camera: secret.dto.name };
  });

  app.get("/api/cameras/:id/health", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getCamera(id)) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
    return { status: "unknown" };
  });
}

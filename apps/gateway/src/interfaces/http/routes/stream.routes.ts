import { FastifyInstance } from "fastify";
import { CameraSchema } from "@sistema-camaras/shared";
import fs from "node:fs";
import path from "node:path";
import { CameraStreamService } from "../../../application/services/camera-stream.service.js";
import { StreamTicketService } from "../../../domain/services/stream-ticket-service.js";
import { readStreamTicket, streamTicketCookie } from "../guards/stream-ticket.guard.js";

export function streamRoutesFactory(streams: CameraStreamService, tickets: StreamTicketService) {
  return async function streamRoutes(app: FastifyInstance) {
    app.post("/streams/:cameraId/ticket", async (req, reply) => {
      const { cameraId } = req.params as { cameraId: string };
      if (!CameraSchema.shape.id.safeParse(cameraId).success) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      }

      const userId = tickets.subject(readStreamTicket(req.headers.cookie), cameraId);
      if (!userId) {
        return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Stream access expired or missing" } });
      }
      if (!streams.exists(cameraId)) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      }

      const ticket = tickets.issue(userId, cameraId);
      reply.header("Set-Cookie", streamTicketCookie(ticket, cameraId, req.protocol === "https"));
      return reply.header("Cache-Control", "no-store").send({ status: "refreshed" });
    });

    app.get("/streams/:cameraId/index.m3u8", async (req, reply) => {
      const { cameraId } = req.params as { cameraId: string };
      if (!CameraSchema.shape.id.safeParse(cameraId).success) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      }
      if (!tickets.subject(readStreamTicket(req.headers.cookie), cameraId)) {
        return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Stream access expired or missing" } });
      }

      const playlistPath = await streams.playlistPath(cameraId);
      if (!playlistPath) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Camera not found" } });
      }
      const waitUntil = Date.now() + 4000;
      while (!fs.existsSync(playlistPath) && Date.now() < waitUntil) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (!fs.existsSync(playlistPath)) {
        return reply.code(503).send({ error: { code: "STREAM_ERROR", message: "Stream not ready" } });
      }

      const playlist = await fs.promises.readFile(playlistPath, "utf8");
      return reply
        .type("application/vnd.apple.mpegurl")
        .header("Cache-Control", "private, no-store")
        .send(playlist);
    });

    app.get("/streams/:cameraId/:file", async (req, reply) => {
      const { cameraId, file } = req.params as { cameraId: string; file: string };
      if (!CameraSchema.shape.id.safeParse(cameraId).success) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Stream segment not found" } });
      }
      if (!tickets.subject(readStreamTicket(req.headers.cookie), cameraId)) {
        return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Stream access expired or missing" } });
      }
      if (!streams.exists(cameraId) || !/^[\w.-]+\.ts$/.test(file)) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Stream segment not found" } });
      }

      streams.keepAlive(cameraId);
      return reply
        .header("Cache-Control", "private, no-store")
        .sendFile(file, path.resolve("./data/streams", cameraId));
    });
  };
}

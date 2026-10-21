import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";
import { getDb } from "./db.js";
import { authRoutes } from "./routes/auth.js";
import { cameraRoutes } from "./routes/cameras.js";
import { streamManager } from "./media/stream-manager.js";
import { getCameraWithSecret } from "./repositories/cameras.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: config.logLevel } });

  getDb();
  fs.mkdirSync(path.resolve("./data/streams"), { recursive: true });

  await app.register(cors, { origin: true, credentials: true });

  // Serve HLS segments produced by ffmpeg
  await app.register(fastifyStatic, {
    root: path.resolve("./data/streams"),
    prefix: "/streams/",
    decorateReply: true,
    serve: false,
  });

  app.get("/api/health", async () => ({
    status: "ok",
    service: "sistema-camaras-gateway",
    time: new Date().toISOString(),
  }));

  await app.register(async (instance) => {
    await authRoutes(instance);
    await cameraRoutes(instance);
  });

  // Start stream on demand when HLS playlist is requested
  app.get("/streams/:cameraId/index.m3u8", async (req, reply) => {
    const { cameraId } = req.params as { cameraId: string };
    const secret = getCameraWithSecret(cameraId);
    const rtspUrl = secret
      ? `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.dto.ip}:554${secret.dto.channel === "sd" ? "/stream2" : "/stream1"}`
      : "";
    await streamManager.ensureRunning(cameraId, rtspUrl);
    streamManager.resetIdle(cameraId);
    // Wait briefly for first segment
    const stream = streamManager.get(cameraId);
    const fs = await import("node:fs");
    const waitUntil = Date.now() + 4000;
    while (!fs.existsSync(stream.hlsPath) && Date.now() < waitUntil) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!fs.existsSync(stream.hlsPath)) {
      return reply.code(503).send({ error: { code: "STREAM_ERROR", message: "Stream not ready" } });
    }
    return reply.sendFile("index.m3u8", path.join("./data/streams", cameraId));
  });

  app.get("/streams/:cameraId/:file", async (req, reply) => {
    const { cameraId, file } = req.params as { cameraId: string; file: string };
    if (file.endsWith(".m3u8")) {
      const secret = getCameraWithSecret(cameraId);
      const rtspUrl = secret
        ? `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.dto.ip}:554${secret.dto.channel === "sd" ? "/stream2" : "/stream1"}`
        : "";
      await streamManager.ensureRunning(cameraId, rtspUrl);
    }
    streamManager.resetIdle(cameraId);
    return reply.sendFile(file, path.join("./data/streams", cameraId));
  });

  app.addHook("onClose", async () => {
    streamManager.stopAll();
  });

  return app;
}

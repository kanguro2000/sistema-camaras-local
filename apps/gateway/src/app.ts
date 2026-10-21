import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";
import { getDatabase } from "./infrastructure/db/sqlite.database.js";
import { SqliteUserRepository } from "./infrastructure/repositories/sqlite-user.repository.js";
import { SqliteCameraRepository } from "./infrastructure/repositories/sqlite-camera.repository.js";
import { AuthService } from "./application/services/auth.service.js";
import { CameraService } from "./application/services/camera.service.js";
import { authRoutesFactory } from "./interfaces/http/routes/auth.routes.js";
import { cameraRoutesFactory } from "./interfaces/http/routes/camera.routes.js";
import { streamManager } from "./infrastructure/media/stream-manager.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: config.logLevel } });

  getDatabase();
  fs.mkdirSync(path.resolve("./data/streams"), { recursive: true });

  const userRepo = new SqliteUserRepository();
  const cameraRepo = new SqliteCameraRepository();
  const auth = new AuthService(userRepo);
  const cameras = new CameraService(cameraRepo);

  await app.register(cors, { origin: true, credentials: true });

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

  await app.register(authRoutesFactory(auth));
  await app.register(cameraRoutesFactory(cameras));

  app.get("/streams/:cameraId/index.m3u8", async (req, reply) => {
    const { cameraId } = req.params as { cameraId: string };
    const secret = cameraRepo.getWithSecret(cameraId);
    const rtspUrl = secret
      ? `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.camera.ip}:554${secret.camera.channel === "sd" ? "/stream2" : "/stream1"}`
      : "";
    await streamManager.ensureRunning(cameraId, rtspUrl);
    streamManager.resetIdle(cameraId);
    const stream = streamManager.get(cameraId);
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
      const secret = cameraRepo.getWithSecret(cameraId);
      const rtspUrl = secret
        ? `rtsp://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${secret.camera.ip}:554${secret.camera.channel === "sd" ? "/stream2" : "/stream1"}`
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

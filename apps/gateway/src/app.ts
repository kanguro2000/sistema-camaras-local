import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";
import { getDatabase } from "./infrastructure/db/sqlite.database.js";
import { SqliteUserRepository } from "./infrastructure/repositories/sqlite-user.repository.js";
import { SqliteCameraRepository } from "./infrastructure/repositories/sqlite-camera.repository.js";
import { AuthService } from "./application/services/auth.service.js";
import { CameraService } from "./application/services/camera.service.js";
import { CameraStreamService } from "./application/services/camera-stream.service.js";
import { probeRtsp } from "./infrastructure/media/probe.js";
import { BcryptPasswordHasher } from "./infrastructure/security/bcrypt-password-hasher.js";
import { JwtAccessTokenService } from "./infrastructure/security/jwt-access-token.service.js";
import { authRoutesFactory } from "./interfaces/http/routes/auth.routes.js";
import { cameraRoutesFactory } from "./interfaces/http/routes/camera.routes.js";
import { streamRoutesFactory } from "./interfaces/http/routes/stream.routes.js";
import { streamManager } from "./infrastructure/media/stream-manager.js";
import { JwtStreamTicketService } from "./infrastructure/security/jwt-stream-ticket.service.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: config.logLevel } });

  getDatabase();
  fs.mkdirSync(path.resolve("./data/streams"), { recursive: true });

  const userRepo = new SqliteUserRepository();
  const cameraRepo = new SqliteCameraRepository();
  const auth = new AuthService(
    userRepo,
    new BcryptPasswordHasher(),
    new JwtAccessTokenService(config.jwtSecret),
  );
  const cameras = new CameraService(cameraRepo, { probe: probeRtsp });
  const streamTickets = new JwtStreamTicketService(config.jwtSecret);
  const cameraStreams = new CameraStreamService(cameraRepo, streamManager);

  await app.register(cors, {
    origin: config.corsOrigins.length ? config.corsOrigins : false,
    credentials: config.corsOrigins.length > 0,
  });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        frameAncestors: ["'none'"],
      },
    },
  });
  await app.register(rateLimit, { global: false });

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
  await app.register(cameraRoutesFactory(cameras, auth, streamTickets, cameraStreams));
  await app.register(streamRoutesFactory(cameraStreams, streamTickets));

  app.addHook("onClose", async () => {
    streamManager.stopAll();
  });

  return app;
}

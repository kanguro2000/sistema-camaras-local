import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { getDb } from "./db.js";
import { authRoutes } from "./routes/auth.js";
import { cameraRoutes } from "./routes/cameras.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: config.logLevel } });

  // Initialize DB (creates schema + seed admin)
  getDb();

  await app.register(cors, {
    origin: true,
    credentials: true,
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

  return app;
}

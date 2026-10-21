import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: config.logLevel } });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get("/api/health", async () => ({
    status: "ok",
    service: "sistema-camaras-gateway",
    time: new Date().toISOString(),
  }));

  // Placeholder: cameras CRUD se implementara con SQLite (ver specs/03-backend-api.md)
  const cameras: unknown[] = [];
  app.get("/api/cameras", async () => ({ items: cameras }));
  app.post("/api/cameras", async (req, reply) => {
    const body = req.body;
    cameras.push({ id: crypto.randomUUID(), ...(body as object) });
    return reply.code(201).send({ ok: true });
  });

  return app;
}

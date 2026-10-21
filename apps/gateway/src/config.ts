import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8080),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  masterKey: process.env.MASTER_KEY ?? "",
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  mediamtxUrl: process.env.MEDIAMTX_URL ?? "http://localhost:8888",
  logLevel: process.env.LOG_LEVEL ?? "info",
  nodeEnv: process.env.NODE_ENV ?? "development",
};

if (!process.env.JWT_SECRET) {
  console.warn("[config] JWT_SECRET not set; using insecure dev secret. Set JWT_SECRET in production.");
}
if (!process.env.MASTER_KEY) {
  console.warn("[config] MASTER_KEY not set; using insecure dev key. Set MASTER_KEY in production.");
}

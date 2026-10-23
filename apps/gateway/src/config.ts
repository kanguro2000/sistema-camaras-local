import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [path.resolve(process.cwd(), ".env"), path.resolve(moduleDirectory, "../../../.env")];
for (const envPath of new Set(envPaths)) {
  if (!dotenv.config({ path: envPath }).error) break;
}

function isValidMasterKey(value: string): boolean {
  if (/^[\da-f]{64}$/i.test(value)) return true;
  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 && decoded.toString("base64") === value;
}

const EnvironmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  JWT_SECRET: z.string().min(32),
  MASTER_KEY: z.string().refine(isValidMasterKey),
  DB_PATH: z.string().min(1).default("./data/app.db"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADMIN_PASSWORD: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .refine(
      (origins) =>
        origins.every((origin) => {
          try {
            const parsedOrigin = new URL(origin);
            return ["http:", "https:"].includes(parsedOrigin.protocol) && parsedOrigin.origin === origin;
          } catch {
            return false;
          }
        }),
      "CORS_ORIGINS must be a comma-separated list of HTTP(S) origins without paths",
    ),
});

const parsed = EnvironmentSchema.safeParse(process.env);
if (!parsed.success) {
  const invalidNames = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
  throw new Error(`Invalid environment configuration: ${invalidNames.join(", ")}`);
}

const masterKey = /^[\da-f]{64}$/i.test(parsed.data.MASTER_KEY)
  ? Buffer.from(parsed.data.MASTER_KEY, "hex")
  : Buffer.from(parsed.data.MASTER_KEY, "base64");

export const config = {
  port: parsed.data.PORT,
  jwtSecret: parsed.data.JWT_SECRET,
  masterKey,
  dbPath: parsed.data.DB_PATH,
  logLevel: parsed.data.LOG_LEVEL,
  nodeEnv: parsed.data.NODE_ENV,
  adminPassword: parsed.data.ADMIN_PASSWORD,
  corsOrigins: parsed.data.CORS_ORIGINS,
};

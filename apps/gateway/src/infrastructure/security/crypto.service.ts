import crypto from "node:crypto";
import { config } from "../../config.js";

const ALG = "aes-256-gcm";

function getKey(): Buffer {
  if (config.masterKey) {
    const buf = Buffer.from(config.masterKey, "base64");
    if (buf.length === 32) return buf;
    const hex = Buffer.from(config.masterKey, "hex");
    if (hex.length === 32) return hex;
    throw new Error("MASTER_KEY must be 32 bytes (base64 or hex)");
  }
  console.warn("[crypto] MASTER_KEY not set; using insecure dev key. Set MASTER_KEY in production.");
  return crypto.createHash("sha256").update("dev-insecure-key").digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(":");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, encB64] = payload.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

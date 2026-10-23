import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.argv[2] || ".env");
const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(24).toString("base64url");

if (fs.existsSync(envPath)) {
  console.error("Refusing to overwrite an existing environment file.");
  process.exit(1);
}
if (adminPassword.length < 12) {
  console.error("ADMIN_PASSWORD must contain at least 12 characters.");
  process.exit(1);
}

const masterKey = crypto.randomBytes(32).toString("base64");
const jwtSecret = crypto.randomBytes(32).toString("hex");
const content = `PORT=8080
JWT_SECRET=${jwtSecret}
MASTER_KEY=${masterKey}
DB_PATH=./data/app.db
LOG_LEVEL=info
NODE_ENV=development
ADMIN_PASSWORD=${adminPassword}
CORS_ORIGINS=
HOST_UID=1000
HOST_GID=1000
`;

fs.mkdirSync(path.dirname(envPath), { recursive: true });
fs.writeFileSync(envPath, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
console.log(`Environment file generated at ${envPath}. Secrets were not printed.`);

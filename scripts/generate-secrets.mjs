import crypto from "node:crypto";
import fs from "node:fs";

const envPath = process.argv[2] || ".env";
const adminPassword = process.env.ADMIN_PASSWORD || "admin";

if (fs.existsSync(envPath)) {
  const backup = `${envPath}.bak.${Date.now()}`;
  fs.copyFileSync(envPath, backup);
  console.log(`Backup creado: ${backup}`);
}

const masterKey = crypto.randomBytes(32).toString("base64");
const jwtSecret = crypto.randomBytes(32).toString("hex");

const content = `PORT=8080
JWT_SECRET=${jwtSecret}
MASTER_KEY=${masterKey}
DB_PATH=./data/app.db
MEDIAMTX_URL=http://localhost:8888
LOG_LEVEL=info
NODE_ENV=development
ADMIN_PASSWORD=${adminPassword}
`;

fs.writeFileSync(envPath, content);
console.log(`==> ${envPath} generado`);
console.log(`MASTER_KEY=${masterKey}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ADMIN_PASSWORD=${adminPassword} (cambiar si es necesario)`);

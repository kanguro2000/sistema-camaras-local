#!/usr/bin/env bash
# Genera .env con MASTER_KEY y JWT_SECRET aleatorios.
# Uso: bash deploy/generate-secrets.sh [ruta/.env]
set -euo pipefail

ENV_FILE="${1:-.env}"

if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
  echo "Backup creado: $ENV_FILE.bak.*"
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl no encontrado. Usando Node.js..."
  MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
else
  MASTER_KEY=$(openssl rand -base64 32)
  JWT_SECRET=$(openssl rand -hex 32)
fi

ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

cat > "$ENV_FILE" <<EOF
PORT=8080
JWT_SECRET=$JWT_SECRET
MASTER_KEY=$MASTER_KEY
DB_PATH=./data/app.db
MEDIAMTX_URL=http://localhost:8888
LOG_LEVEL=info
NODE_ENV=production
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

echo "==> $ENV_FILE generado"
echo "MASTER_KEY=$MASTER_KEY"
echo "JWT_SECRET=$JWT_SECRET"
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD (cambiar si es necesario)"

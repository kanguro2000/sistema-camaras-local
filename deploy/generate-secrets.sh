#!/usr/bin/env bash
# Genera un archivo .env con secretos aleatorios sin imprimirlos.
# Uso: bash deploy/generate-secrets.sh [ruta/.env]
set -euo pipefail
umask 077

ENV_FILE="${1:-.env}"
if [ -e "$ENV_FILE" ]; then
  echo "Se rechaza sobrescribir un archivo de entorno existente." >&2
  exit 1
fi

ENV_DIR="$(dirname "$ENV_FILE")"
mkdir -p "$ENV_DIR"

if command -v openssl >/dev/null 2>&1; then
  MASTER_KEY="$(openssl rand -base64 32)"
  JWT_SECRET="$(openssl rand -hex 32)"
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
else
  MASTER_KEY="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))")"
  JWT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
  ADMIN_PASSWORD="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('base64url'))")"
fi

cat > "$ENV_FILE" <<EOF
PORT=8080
JWT_SECRET=$JWT_SECRET
MASTER_KEY=$MASTER_KEY
DB_PATH=./data/app.db
LOG_LEVEL=info
NODE_ENV=production
ADMIN_PASSWORD=$ADMIN_PASSWORD
CORS_ORIGINS=
HOST_UID=$(id -u)
HOST_GID=$(id -g)
EOF
chmod 600 "$ENV_FILE"
echo "Archivo de entorno generado en $ENV_FILE. Los secretos no se imprimieron."
echo "La contraseña inicial se guardó en el archivo; consúltalo en un equipo de confianza."

#!/usr/bin/env bash
# Respaldo local de data/app.db (y opcionalmente .env) con rotación.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
DB_FILE="$ROOT_DIR/data/app.db"
KEEP="${BACKUP_KEEP:-14}"
INCLUDE_ENV="${BACKUP_INCLUDE_ENV:-1}"

if [[ $EUID -eq 0 ]]; then
  DEFAULT_DIR="/var/backups/sistema-camaras"
  DOCKER=(docker)
else
  DEFAULT_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/sistema-camaras-local/backups"
  DOCKER=(sudo docker)
fi
BACKUP_ROOT="${BACKUP_DIR:-$DEFAULT_DIR}"

if [[ ! "$KEEP" =~ ^[1-9][0-9]*$ ]]; then
  echo "BACKUP_KEEP debe ser un entero positivo." >&2
  exit 2
fi
if [[ ! -f "$DB_FILE" ]]; then
  echo "No existe $DB_FILE; no hay nada que respaldar." >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
TARGET="$BACKUP_ROOT/backup-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$TARGET"

gateway_stopped=0
restart_gateway() {
  if [[ $gateway_stopped -eq 1 ]]; then
    "${DOCKER[@]}" compose -f "$COMPOSE_FILE" start gateway >/dev/null
    gateway_stopped=0
  fi
}
trap restart_gateway EXIT

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_FILE" ".backup '$TARGET/app.db'"
else
  # Sin sqlite3 se detiene el gateway unos segundos para copiar una base consistente.
  "${DOCKER[@]}" compose -f "$COMPOSE_FILE" stop gateway >/dev/null
  gateway_stopped=1
  cp "$DB_FILE" "$TARGET/app.db"
  restart_gateway
fi

if [[ ! -s "$TARGET/app.db" ]]; then
  echo "El respaldo quedó vacío; se elimina $TARGET." >&2
  rm -rf "$TARGET"
  exit 1
fi

if [[ "$INCLUDE_ENV" == "1" && -f "$ROOT_DIR/.env" ]]; then
  cp "$ROOT_DIR/.env" "$TARGET/env"
fi

# Rotación: conserva solo los KEEP respaldos más recientes.
mapfile -t OLD < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'backup-*' | sort | head -n "-$KEEP")
for dir in "${OLD[@]}"; do
  rm -rf -- "$dir"
done

echo "Respaldo creado: $TARGET"

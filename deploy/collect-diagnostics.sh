#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
SINCE="${1:-1h}"

if [[ ! "$SINCE" =~ ^[0-9]+[smhd]$ ]]; then
  echo "Uso: bash deploy/collect-diagnostics.sh [duracion: 30m, 2h, 1d]" >&2
  exit 2
fi

if sudo docker compose version >/dev/null 2>&1; then
  compose() {
    sudo docker compose -f "$COMPOSE_FILE" "$@"
  }
elif sudo docker-compose version >/dev/null 2>&1; then
  compose() {
    sudo docker-compose -f "$COMPOSE_FILE" "$@"
  }
else
  echo "No se encontro Docker Compose. Verifica la instalacion de Docker." >&2
  exit 1
fi

REPORT_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/sistema-camaras-local"
mkdir -p "$REPORT_DIR"
chmod 700 "$REPORT_DIR"
umask 077
REPORT_FILE="$(mktemp "$REPORT_DIR/diagnostics-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX.txt")"

sanitize() {
  sed -E \
    -e 's#rtsps?://[^[:space:]"<>]+#rtsp://[REDACTED]#Ig' \
    -e 's#("(username|password|passwd|token|authorization|cookie|secret|master_key|jwt_secret|admin_password)"[[:space:]]*:[[:space:]]*)"[^"]*"#\1"[REDACTED]"#Ig' \
    -e 's#((username|password|passwd|token|authorization|cookie|secret|master_key|jwt_secret|admin_password)=)[^[:space:]&;,}]+#\1[REDACTED]#Ig' \
    -e 's#(Bearer )[[:alnum:]_.-]+#\1[REDACTED]#Ig' \
    -e 's#\b([0-9]{1,3}\.){3}[0-9]{1,3}\b#[IP]#g'
}

{
  echo "Sistema de cámaras local — informe de diagnóstico"
  echo "Generado (UTC): $(date -u --iso-8601=seconds)"
  echo "Periodo de logs: últimos $SINCE"
  echo
  echo "== Sistema =="
  uname -srm
  echo
  echo "== Docker =="
  if ! sudo docker version --format 'Client: {{.Client.Version}} | Server: {{.Server.Version}}'; then
    echo "No fue posible consultar la version de Docker."
  fi
  if ! sudo docker compose version 2>&1 && ! sudo docker-compose version 2>&1; then
    echo "No fue posible consultar la version de Docker Compose."
  fi
  echo
  echo "== Estado de servicios =="
  if ! compose ps --all; then
    echo "No fue posible consultar los servicios de Docker Compose."
  fi
  echo
  echo "== Health de la aplicación =="
  if ! curl --fail --silent --show-error --max-time 4 http://localhost:8080/api/health; then
    echo "No fue posible consultar /api/health"
  fi
  echo
  echo "== Logs recientes (gateway y web) =="
  if ! compose logs --no-color --since="$SINCE" --tail=500 gateway web; then
    echo "No fue posible consultar los logs de gateway y web."
  fi
} 2>&1 | sanitize > "$REPORT_FILE"

chmod 600 "$REPORT_FILE"
echo "Informe creado: $REPORT_FILE"
echo "Revisa el archivo antes de compartirlo y elimina cualquier dato privado que aún aparezca."

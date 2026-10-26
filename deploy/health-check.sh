#!/usr/bin/env bash
# Chequeo de salud: API, contenedores, errores recientes del gateway y espacio en disco.
# Termina con código distinto de cero si algo falla; systemd lo registra en el journal.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/api/health}"
ERROR_WINDOW="${ERROR_WINDOW:-10m}"
ERROR_THRESHOLD="${ERROR_THRESHOLD:-20}"
DISK_MAX_PERCENT="${DISK_MAX_PERCENT:-90}"

if [[ $EUID -eq 0 ]]; then
  DOCKER=(docker)
else
  DOCKER=(sudo docker)
fi

failures=0
fail() {
  echo "FALLO: $*" >&2
  failures=$((failures + 1))
}

if curl --fail --silent --max-time 5 "$HEALTH_URL" >/dev/null; then
  echo "OK: API responde en $HEALTH_URL"
else
  fail "la API no responde en $HEALTH_URL"
fi

for service in gateway web; do
  running="$("${DOCKER[@]}" compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -Fx "$service" || true)"
  if [[ -n "$running" ]]; then
    echo "OK: contenedor $service en ejecución"
  else
    fail "el contenedor $service no está en ejecución"
  fi
done

# Solo se cuenta el número de errores (nivel 50 de pino); nunca se imprime el contenido de los logs.
errors="$("${DOCKER[@]}" compose -f "$COMPOSE_FILE" logs --no-color --since="$ERROR_WINDOW" gateway 2>/dev/null | grep -c '"level":50' || true)"
errors="${errors:-0}"
if [[ "$errors" -ge "$ERROR_THRESHOLD" ]]; then
  fail "el gateway registró $errors errores en los últimos $ERROR_WINDOW (umbral $ERROR_THRESHOLD); posibles cámaras caídas"
else
  echo "OK: $errors errores del gateway en los últimos $ERROR_WINDOW"
fi

mkdir -p "$ROOT_DIR/data"
used="$(df --output=pcent "$ROOT_DIR/data" | tail -n 1 | tr -dc '0-9')"
if [[ -n "$used" && "$used" -ge "$DISK_MAX_PERCENT" ]]; then
  fail "el disco de data/ está al ${used}% (máximo ${DISK_MAX_PERCENT}%)"
else
  echo "OK: disco de data/ al ${used:-?}%"
fi

if [[ $failures -gt 0 ]]; then
  echo "Chequeo de salud: $failures problema(s)." >&2
  exit 1
fi
echo "Chequeo de salud: todo en orden."

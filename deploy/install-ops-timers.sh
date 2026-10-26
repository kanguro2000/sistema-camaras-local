#!/usr/bin/env bash
# Instala (o quita con --remove) los timers de systemd de respaldo y monitoreo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
UNIT_DIR="/etc/systemd/system"
UNITS=(sistema-camaras-health sistema-camaras-backup)

if [[ "${1:-}" == "--remove" ]]; then
  for unit in "${UNITS[@]}"; do
    sudo systemctl disable --now "$unit.timer" 2>/dev/null || true
    sudo rm -f "$UNIT_DIR/$unit.service" "$UNIT_DIR/$unit.timer"
  done
  sudo systemctl daemon-reload
  echo "Timers eliminados."
  exit 0
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemd no está disponible en este sistema." >&2
  exit 1
fi

for unit in "${UNITS[@]}"; do
  for kind in service timer; do
    sed "s#__ROOT_DIR__#$ROOT_DIR#g" "$SCRIPT_DIR/systemd/$unit.$kind" \
      | sudo tee "$UNIT_DIR/$unit.$kind" >/dev/null
  done
done

sudo systemctl daemon-reload
for unit in "${UNITS[@]}"; do
  sudo systemctl enable --now "$unit.timer"
done

echo "Timers instalados. Estado:"
systemctl list-timers 'sistema-camaras-*' --no-pager

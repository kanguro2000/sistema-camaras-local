#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(dirname "$SCRIPT_DIR")}"

echo "==> Actualizando sistema"
sudo apt update && sudo apt upgrade -y

echo "==> Instalando dependencias"
sudo apt install -y docker.io ffmpeg git curl
# docker compose: probar varios nombres de paquete segun la distro
COMPOSE_INSTALLED=false
for pkg in docker-compose-plugin docker-compose-v2 docker-compose; do
  if sudo apt install -y "$pkg" 2>/dev/null; then
    COMPOSE_INSTALLED=true
    break
  fi
done
if [ "$COMPOSE_INSTALLED" = false ]; then
  echo "No se pudo instalar docker compose via apt. Intenta instalar docker-ce desde el repo oficial."
fi

echo "==> Habilitando Docker"
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "==> Ubicando repo"
if [ ! -d "$REPO_DIR" ]; then
  echo "No se encontro el codigo en: $REPO_DIR"
  echo "Clona el repositorio manualmente antes de ejecutar este script, por ejemplo:"
  echo "  git clone <url-del-repo> $REPO_DIR"
  echo "Luego ejecuta: bash $REPO_DIR/deploy/ubuntu-setup.sh"
  exit 1
fi
cd "$REPO_DIR"

echo "==> Configurando .env"
if [ ! -f .env ]; then
  bash "$SCRIPT_DIR/generate-secrets.sh" "$REPO_DIR/.env"
  echo "==> .env creado. Edita ADMIN_PASSWORD si quieres."
fi

echo "==> Levantando servicios"
cd deploy
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "No se encontro docker compose. Instala docker-compose-plugin o docker-compose."
  exit 1
fi
$COMPOSE up -d --build

echo "==> Verificando health"
sleep 5
curl -s http://localhost:8080/api/health || true

echo ""
echo "Listo. Abre http://$(hostname -I | awk '{print $1}'):8080"
echo "Recuerda cerrar sesion y volver a entrar para aplicar grupo docker."

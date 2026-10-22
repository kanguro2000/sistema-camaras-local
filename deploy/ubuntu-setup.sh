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
REPO_DIR="${REPO_DIR:-$HOME/sistema-camaras-local}"
if [ ! -d "$REPO_DIR" ]; then
  if [ -n "${REPO_URL:-}" ]; then
    git clone "$REPO_URL" "$REPO_DIR"
  else
    echo "Repo no encontrado en $REPO_DIR."
    echo "Clona manualmente o define REPO_URL, por ejemplo:"
    echo "  REPO_URL=https://github.com/tu-usuario/sistema-camaras-local.git bash deploy/ubuntu-setup.sh"
    echo "O ejecuta el script desde dentro del repo ya clonado."
    exit 1
  fi
fi
cd "$REPO_DIR"

echo "==> Configurando .env"
if [ ! -f .env ]; then
  bash ./generate-secrets.sh .env
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

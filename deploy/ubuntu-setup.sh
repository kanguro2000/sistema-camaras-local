#!/usr/bin/env bash
set -euo pipefail

echo "==> Actualizando sistema"
sudo apt update && sudo apt upgrade -y

echo "==> Instalando dependencias"
sudo apt install -y docker.io ffmpeg git curl
# docker compose plugin (opcional, puede no estar disponible en repos antiguos)
if ! sudo apt install -y docker-compose-plugin 2>/dev/null; then
  echo "docker-compose-plugin no disponible, instalando docker-compose (v1)..."
  sudo apt install -y docker-compose || true
fi

echo "==> Habilitando Docker"
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "==> Clonando repo (si no existe)"
if [ ! -d "$HOME/sistema-camaras-local" ]; then
  git clone https://github.com/tu-usuario/sistema-camaras-local.git "$HOME/sistema-camaras-local"
fi
cd "$HOME/sistema-camaras-local"

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

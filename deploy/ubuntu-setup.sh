#!/usr/bin/env bash
set -euo pipefail

echo "==> Actualizando sistema"
sudo apt update && sudo apt upgrade -y

echo "==> Instalando dependencias"
sudo apt install -y docker.io docker-compose-plugin ffmpeg git curl

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
  cp .env.example .env
  JWT=$(openssl rand -hex 32)
  MASTER=$(openssl rand -base64 32)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT/" .env
  sed -i "s/^MASTER_KEY=.*/MASTER_KEY=$MASTER/" .env
  echo "ADMIN_PASSWORD=admin (cambiar en .env)" >> .env
  echo "==> .env creado. Edita ADMIN_PASSWORD si quieres."
fi

echo "==> Levantando servicios"
cd deploy
docker compose up -d --build

echo "==> Verificando health"
sleep 5
curl -s http://localhost:8080/api/health || true

echo ""
echo "Listo. Abre http://$(hostname -I | awk '{print $1}'):8080"
echo "Recuerda cerrar sesion y volver a entrar para aplicar grupo docker."

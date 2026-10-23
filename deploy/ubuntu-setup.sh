#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(dirname "$SCRIPT_DIR")}"

echo "==> Actualizando lista de paquetes"
sudo apt-get update

echo "==> Instalando dependencias"
sudo apt-get install -y ca-certificates curl docker.io git
# docker compose: probar varios nombres de paquete segun la distro
COMPOSE_INSTALLED=false
for pkg in docker-compose-plugin docker-compose-v2 docker-compose; do
  if sudo apt-get install -y "$pkg" 2>/dev/null; then
    COMPOSE_INSTALLED=true
    break
  fi
done
if [ "$COMPOSE_INSTALLED" = false ]; then
  echo "No se pudo instalar docker compose via apt. Intenta instalar docker-ce desde el repo oficial."
fi

echo "==> Habilitando Docker"
sudo systemctl enable --now docker

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
  echo "==> .env creado; la contraseña inicial se guardó en ese archivo y no se mostró."
fi

echo "==> Preparando almacenamiento"
mkdir -p "$REPO_DIR/data"

if sudo docker compose version >/dev/null 2>&1; then
  COMPOSE_KIND="plugin"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_KIND="standalone"
else
  echo "No se encontro Docker Compose. Instala docker-compose-plugin o docker-compose." >&2
  exit 1
fi

compose() {
  if [ "$COMPOSE_KIND" = "plugin" ]; then
    sudo env HOST_UID="$(id -u)" HOST_GID="$(id -g)" docker compose -f "$SCRIPT_DIR/docker-compose.yml" "$@"
  else
    sudo env HOST_UID="$(id -u)" HOST_GID="$(id -g)" docker-compose -f "$SCRIPT_DIR/docker-compose.yml" "$@"
  fi
}

echo "==> Construyendo e iniciando la aplicacion"
compose up -d --build

echo "==> Verificando health"
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 http://localhost:8080/api/health; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "La aplicacion no respondio dentro del tiempo esperado." >&2
    compose logs --tail=100
    exit 1
  fi
  sleep 2
done

echo ""
echo "Instalacion lista. Abre http://$(hostname -I | awk '{print $1}'):8080"

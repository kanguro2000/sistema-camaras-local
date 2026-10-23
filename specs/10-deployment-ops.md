# Spec 10 — Despliegue y Operación

## 1. Requisitos de hardware (gateway)

- Servidor objetivo: laptop Lenovo G480 con Ubuntu (gateway y FFmpeg en Docker; web estática en Nginx).
- PC/Raspberry Pi 4 / NAS con Docker.
- CPU: 2+ cores (transcode ocasional).
- RAM: 2 GB mínimo, 4 GB recomendado.
- Red: Ethernet recomendado, misma LAN que cámaras.
- Node.js 24 en las imágenes de contenedor; no se instala Node.js en el host Ubuntu.

## 2. Docker Compose (referencia)

```yaml
services:
  gateway:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
      target: gateway
    expose: ["8080"]
    volumes: ["../data:/workspace/apps/gateway/data"]
    env_file: ../.env
    restart: unless-stopped
  web:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
      target: web
    ports: ["8080:8080"]
    depends_on: [gateway]
    restart: unless-stopped
```

Solo el frontend/proxy publica el puerto `8080` en la LAN. El gateway queda en la red privada de Compose. No se exponen RTSP, HLS interno ni una API de MediaMTX.

## 3. Variables de entorno

- `PORT`, `JWT_SECRET`, `MASTER_KEY`, `DB_PATH`, `LOG_LEVEL`, `HOST_UID`, `HOST_GID`.
- `.env.example` documentado; nunca commitear `.env`.

## 4. Backups

- Backup de SQLite (`data/*.db`) programado (cron) a carpeta local.
- Restauración documentada.

## 5. Monitoreo

- Health endpoint `/api/health`.
- Logs estructurados (pino) con rotación.
- (Opcional) Prometheus metrics.

## 6. Actualizaciones

- Pull de imagen + recreate container.
- Migraciones de DB automáticas al arranque (versionadas).

## 7. Modo desarrollo

- `pnpm dev` arranca gateway (watch) + frontend (Vite).
- En Ubuntu, `bash deploy/ubuntu-setup.sh` construye las imágenes y valida `/api/health`.

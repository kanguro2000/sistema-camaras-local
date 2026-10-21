# Spec 10 — Despliegue y Operación

## 1. Requisitos de hardware (gateway)

- Servidor objetivo: laptop Lenovo G480 con Ubuntu (gateway + mediamtx en Docker).
- PC/Raspberry Pi 4 / NAS con Docker.
- CPU: 2+ cores (transcode ocasional).
- RAM: 2 GB mínimo, 4 GB recomendado.
- Red: Ethernet recomendado, misma LAN que cámaras.

## 2. Docker Compose (referencia)

```yaml
services:
  gateway:
    image: sistema-camaras-gateway:latest
    ports: ["8080:8080"]
    volumes: ["./data:/data"]
    env_file: .env
    restart: unless-stopped
  mediamtx:
    image: bluenviron/mediamtx:latest
    ports: ["8554:8554", "8888:8888", "8889:8889", "8189:8189/udp"]
    volumes: ["./mediamtx.yml:/mediamtx.yml"]
    restart: unless-stopped
```

## 3. Variables de entorno

- `PORT`, `JWT_SECRET`, `MASTER_KEY`, `DB_PATH`, `MEDIAMTX_URL`, `LOG_LEVEL`.
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
- mediamtx local o vía Docker.

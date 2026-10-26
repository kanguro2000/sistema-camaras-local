# Spec 10 — Despliegue y Operación

## 1. Requisitos de hardware (gateway)

- Servidor objetivo: laptop Lenovo G480 con Ubuntu (gateway y FFmpeg en Docker; web estática en Nginx).
- PC/Raspberry Pi 4 / NAS con Docker.
- CPU: 2+ cores (transcode ocasional).
- RAM: 2 GB mínimo, 4 GB recomendado.
- Red: Ethernet recomendado, misma LAN que cámaras.
- Node.js 24 en las imágenes de contenedor; no se instala Node.js en el host Ubuntu.

## 2. Docker Compose

La configuración mantenida está en `deploy/docker-compose.yml`; el Dockerfile
multi-stage está en `deploy/Dockerfile`. Desde la raíz del repositorio:

```bash
sudo docker compose -f deploy/docker-compose.yml up -d --build
sudo docker compose -f deploy/docker-compose.yml ps
curl --fail --silent --show-error http://localhost:8080/api/health
```

Solo Nginx publica el puerto `8080` en la LAN. El gateway queda en la red
privada de Compose; no se exponen RTSP, HLS interno ni la API de MediaMTX. El
`.env` está en la raíz del repositorio y Compose monta `data/` del host en
`/workspace/apps/gateway/data` dentro del gateway.

## 3. Variables de entorno

- `PORT`, `JWT_SECRET`, `MASTER_KEY`, `DB_PATH`, `LOG_LEVEL`, `HOST_UID`, `HOST_GID`.
- `.env.example` documentado; nunca commitear `.env`.

## 4. Backups

- Respaldar `data/app.db` con el gateway detenido para obtener una copia
  consistente de SQLite.
- Conservar una copia segura del `.env`, especialmente el mismo `MASTER_KEY`
  necesario para descifrar credenciales de cámara.
- Restaurar primero con los servicios detenidos; iniciar de nuevo para aplicar
  migraciones si corresponden.
- Comandos paso a paso en [`docs/operations-runbook.md`](../docs/operations-runbook.md).

## 5. Monitoreo

- Health endpoint `/api/health`.
- Logs estructurados (pino) con rotación Docker (10 MB, 3 archivos por servicio).
- Los fallos de probe RTSP, FFmpeg y generación de playlist se registran sin credenciales.
- `bash deploy/collect-diagnostics.sh [duración]` crea un informe local sanitizado con estado de servicios, health y logs recientes; no adjunta `.env` ni la base de datos.
- (Opcional) Prometheus metrics.

Para comandos de inicio, reinicio, actualización y solución de problemas,
consultar [`docs/operations-runbook.md`](../docs/operations-runbook.md).

## 6. Actualizaciones

- Pull de imagen + recreate container.
- Migraciones de DB automáticas al arranque (versionadas).

## 7. Modo desarrollo

- `pnpm dev` arranca gateway (watch) + frontend (Vite).
- En Ubuntu, `bash deploy/ubuntu-setup.sh` construye las imágenes y valida `/api/health`.

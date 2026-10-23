# Sistema de Cámaras Local — Tapo en TV

Visualización en vivo de cámaras TP-Link Tapo en TVs Hisense (Vidaa) y TCL (Android TV), mediante un servidor intermedio (gateway) + app web.

## Documentación

- `PROMPT.md` — prompt maestro del proyecto.
- `MEMORY.md` — memoria y decisiones (ADR).
- `AGENTS.md` — guía para agentes de código.
- `specs/` — especificaciones técnicas.
- `skills/` — skills para agentes.

## Inicio rápido (desarrollo)

```bash
pnpm install
pnpm secrets           # genera .env con secretos aleatorios; no los imprime
pnpm dev               # gateway + web
```

La contraseña inicial de `admin` se guarda en `.env`; consúltala solo en el equipo de confianza donde corre el gateway. No uses valores de ejemplo para `JWT_SECRET` o `MASTER_KEY`. Si `.env` ya existe, el generador se niega a sobrescribirlo.

## Despliegue en Ubuntu (Lenovo G480)

```bash
git clone <url-del-repositorio> sistema-camaras-local
cd sistema-camaras-local
bash deploy/ubuntu-setup.sh
```

El script instala Docker/Compose sin agregar el usuario al grupo `docker`, crea `.env` solo si no existe y levanta la app en `http://<IP-LAN>:8080`. El gateway y FFmpeg corren en contenedores; la interfaz web se sirve por Nginx y hace proxy a la API/streams. No se publica el puerto interno del gateway ni se requiere instalar Node.js o FFmpeg en Ubuntu.

Se requiere conectividad a Internet durante la primera construcción de las imágenes. No configures reenvío del puerto 8080 desde el router a Internet. Ver `deploy/TESTING.md` para la checklist posterior.

Despliegue manual: ver `specs/10-deployment-ops.md`.

## Estado

MVP local: gateway, API, autenticación, administración básica de cámaras y reproducción HLS.

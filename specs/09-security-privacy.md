# Spec 09 — Seguridad y Privacidad

## 1. Principios

- Local-first: sin cloud ni telemetría.
- Mínimo privilegio: roles admin/viewer.
- Credenciales nunca en claro.

## 2. Autenticación

- JWT access (15 min) + refresh (7 días), rotación de refresh.
- bcrypt (cost 12) para passwords de usuario.
- Rate limiting en /api/auth/login (5/min por IP).
- Bloqueo temporal tras N intentos fallidos.

## 3. Cifrado de credenciales de cámara

- AES-256-GCM con clave maestra `MASTER_KEY` (32 bytes, base64 en .env).
- IV aleatorio por registro; tag de autenticación guardado.
- Clave nunca en DB ni logs.

## 4. Transporte

- HTTP en LAN por defecto (simplicidad).
- HTTPS opcional vía reverse proxy (nginx/Caddy) con cert autofirmado o Let's Encrypt (si hay dominio local).
- CORS restringido a orígenes conocidos (TV apps, localhost).

## 5. Exposición de streams

- Streams requieren token (query param o cookie) validado por gateway/mediamtx.
- No exponer RTSP al exterior.
- mediamtx API interna (localhost) no pública.

## 6. Privacidad

- Sin analytics, sin crash reporting externo.
- Logs sin PII ni credenciales (redacción automática).
- Backups locales cifrados opcional.

## 7. Hardening

- Helmet headers.
- Validación Zod en todos los endpoints.
- SQL parametrizado (better-sqlite3).
- Dependencias auditadas (npm audit).

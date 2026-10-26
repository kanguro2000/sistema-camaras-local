# Spec 09 — Seguridad y Privacidad

## 1. Principios

- Local-first: sin cloud ni telemetría.
- Mínimo privilegio: roles admin/viewer.
- Credenciales nunca en claro ni en respuestas/logs.
- `JWT_SECRET` y `MASTER_KEY` son obligatorios; no hay claves de desarrollo implícitas.
- El usuario admin inicial requiere `ADMIN_PASSWORD` de al menos 12 caracteres.
- CORS queda deshabilitado por defecto y solo permite los orígenes de `CORS_ORIGINS`.
- Los generadores crean secretos aleatorios y no los imprimen; no sobrescriben archivos `.env` existentes.

## 2. Autenticación

- JWT access (15 min) + refresh opaco (7 días), rotación de un solo uso y revocación de sesión al reutilizar un token consumido.
- El refresh token se almacena hasheado en SQLite y se entrega solo mediante cookie `HttpOnly`, `SameSite=Strict` y con `Secure` en HTTPS. Logout revoca la sesión de refresh; el JWT de acceso vigente conserva su expiración máxima de 15 minutos.
- bcrypt (cost 12) para passwords de usuario.
- Rate limiting en `/api/auth/login` (5/min por IP).
- Cabeceras de seguridad HTTP mediante Helmet; secretos requeridos y validados al arrancar.
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

- HLS requiere un ticket JWT de 1 hora en cookie `HttpOnly`, `SameSite=Strict` y con `Path` limitado a una cámara; se renueva mientras el ticket siga vigente.
- No exponer RTSP al exterior.
- El gateway no publica puertos del host; solo Nginx publica `8080` en la LAN y reenvía API/streams por la red privada de Compose.
- No configurar reenvío del puerto 8080 en el router hacia Internet.

## 6. Privacidad

- Sin analytics, sin crash reporting externo.
- Logs sin PII ni credenciales (redacción automática).
- Backups locales cifrados opcional.

## 7. Hardening

- Helmet headers.
- Validación Zod en todos los endpoints.
- SQL parametrizado (SQLite).
- Dependencias auditadas (npm audit).
- Contenedor del gateway sin root, con sistema de archivos de solo lectura y sin capabilities adicionales; el volumen de datos es el único almacenamiento persistente escribible.
- `.env` se excluye del contexto de build y nunca se copia a las imágenes.

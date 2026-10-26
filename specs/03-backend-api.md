# Spec 03 — Backend API

## 1. Convenciones

- Base URL: `http://<host>:8080/api` (configurable).
- Auth: `Authorization: Bearer <jwt>`.
- Content-Type: `application/json`.
- Errores: `{ error: { code, message, details? } }`.
- Paginación: `?page=&pageSize=`.

## 2. Endpoints

### Auth
- `POST /api/auth/login` { username, password } → { accessToken, user }; sets an opaque refresh token in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`
- `GET /api/auth/me` → usuario autenticado (id, username, role)
- `POST /api/auth/refresh` → { accessToken }; reads and rotates the refresh cookie. Refresh tokens are single-use, stored hashed in SQLite, and expire after 7 days.
- `POST /api/auth/logout` → revokes the refresh session and clears the cookie. A previously issued access JWT remains valid until its 15-minute expiration; the client clears it immediately.

The web client retries an API request once after a 401 by refreshing the access token. Concurrent 401 responses share one refresh request. Refresh tokens are never returned in JSON or stored in browser storage.

### Users (admin)
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Cameras
- `GET /api/cameras` → lista (sin credenciales)
- `POST /api/cameras` (admin) → crea y cifra las credenciales
- `GET /api/cameras/:id`
- `PATCH /api/cameras/:id` (admin)
- `DELETE /api/cameras/:id` (admin)
- `POST /api/cameras/:id/probe` (admin) → valida conectividad
- `GET /api/cameras/:id/stream` → emite cookie de acceso temporal y devuelve URL HLS relativa
- `GET /api/cameras/:id/snapshot` → image/jpeg
- `POST /api/cameras/:id/ptz` { action: 'up'|'down'|'left'|'right'|'zoomin'|'zoomout'|'home'|'preset', speed?, presetId? }
- `GET /api/cameras/:id/presets`
- `POST /api/cameras/:id/presets` { name, position }
- `GET /api/cameras/:id/health` → { status, fps, bitrate, lastFrameAt }

### Streams (servidos por el gateway)
- `GET /streams/:cameraId/index.m3u8` → requiere cookie `camera_stream` temporal, `HttpOnly`, `SameSite=Strict` y limitada a la ruta de esa cámara
- `GET /streams/:cameraId/:segment.ts` → requiere la misma cookie; respuestas `private, no-store`
- `POST /streams/:cameraId/ticket` → renueva el ticket mientras el ticket vigente sea válido
- `POST /streams/:cameraId/whep` (WebRTC, opcional)

### Settings
- `GET /api/settings`
- `PATCH /api/settings`

## 3. Modelos (Zod/TS)

```ts
export const CameraSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  ip: z.string().ip(),
  model: z.string().optional(),
  hasCredentials: z.boolean(),
  // username y password nunca se retornan
  channel: z.enum(['hd', 'sd']).default('hd'),
  rtspPath: z.string().default('/stream1'),
  enabled: z.boolean().default(true),
  ptzSupported: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: z.enum(['admin', 'viewer']),
});
```

## 4. Errores estándar

| Código | HTTP | Descripción |
|--------|------|-------------|
| UNAUTHORIZED | 401 | Token inválido/expirado |
| FORBIDDEN | 403 | Sin permiso |
| NOT_FOUND | 404 | Recurso no existe |
| VALIDATION_ERROR | 400 | Payload inválido |
| CAMERA_UNREACHABLE | 502 | No se pudo conectar a la cámara |
| STREAM_ERROR | 500 | Error de media pipeline |

## 5. Seguridad de credenciales

- Password de cámara se acepta en POST/PATCH, se cifra con AES-256-GCM y se guarda. Nunca se retorna.
- En respuestas, campo `hasCredentials: boolean` en lugar del password.
- Logs redactan password/username.

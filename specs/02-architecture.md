# Spec 02 — Arquitectura

## 1. Vista general

```
┌────────────┐  RTSP   ┌──────────────────────────────────┐  HLS/WebRTC  ┌────────────┐
│ Tapo Cam   │────────▶│  Media Gateway (Node + mediamtx) │─────────────▶│  Web App   │
│ (LAN)      │         │  + REST API + Auth + SQLite      │              │  (TV)      │
└────────────┘         └──────────────────────────────────┘              └────────────┘
                              │
                              └── Tapo HTTP API (PTZ/snapshot) ──▶ cámaras
```

## 2. Componentes

### 2.1 Media Gateway (`apps/gateway`)
- Servidor Node.js 20 + Fastify.
- Gestiona cámaras (CRUD, cifrado credenciales).
- Auth (JWT).
- Orquesta mediamtx (relay) y ffmpeg (transcode condicional).
- Expone streams HLS/WebRTC y API REST.
- Health checks y reconexión.
- Sirve frontend estático (opcional).

### 2.2 Media Relay (mediamtx)
- Proceso externo/binario controlado por el gateway.
- Ingesta RTSP, expone HLS (`/cam/:id/index.m3u8`) y WebRTC (WHEP).
- Soporta on-demand (arranca al primer viewer, para al último salir) para ahorrar CPU.

### 2.3 Frontend (`apps/web`)
- React + Vite + TS, Tailwind.
- Reproductor HLS (hls.js).
- Estado Zustand.
- Navegación por control remoto.

### 2.4 Shared (`packages/shared`)
- Tipos, DTOs, schemas Zod compartidos.

### 2.5 Persistencia (SQLite)
- Tablas: users, cameras, presets, settings.

## 3. Flujos principales

### 3.1 Ver stream
1. TV abre app → GET /api/cameras (lista).
2. Usuario selecciona cámara → frontend carga `<video src="/streams/:id/index.m3u8">`.
3. mediamtx ingesta RTSP on-demand, entrega HLS.
4. Reconexión automática en error de red.

### 3.2 Agregar cámara
1. POST /api/cameras con credenciales.
2. Gateway cifra credenciales, hace probe RTSP.
3. Si OK, guarda y retorna DTO (sin credenciales).

### 3.3 PTZ
1. POST /api/cameras/:id/ptz { action, speed }.
2. Gateway usa Tapo HTTP API (o ONVIF) para mover.

## 4. Despliegue

- Docker Compose: gateway + mediamtx + (opcional) nginx TLS.
- O binario nativo en PC/Raspberry.

## 5. Escalabilidad

- Diseñado para 1 sitio, hasta ~16 cámaras.
- On-demand streams para limitar CPU.
- Una sola instancia de gateway por sitio.

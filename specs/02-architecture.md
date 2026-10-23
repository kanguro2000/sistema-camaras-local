# Spec 02 — Arquitectura

## 1. Vista general

```
┌────────────┐  RTSP   ┌──────────────────────────────────┐  HLS/WebRTC  ┌────────────┐
│ Tapo Cam   │────────▶│  Media Gateway (Node + FFmpeg)   │─────────────▶│  Web App   │
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
- Orquesta FFmpeg para convertir RTSP a HLS bajo demanda.
- Expone streams HLS/WebRTC y API REST.
- Health checks y reconexión.
- Sirve frontend estático (opcional).

### 2.2 Media Relay (mediamtx)
- Alternativa futura para relay y WebRTC; no forma parte del despliegue actual.
- El gateway actual invoca FFmpeg directamente y controla HLS y ciclo de vida de los streams.

### 2.3 Frontend (`apps/web`)
- React + Vite + TS, Tailwind.
- Reproductor HLS (hls.js).
- Estado Zustand.
- Navegación por control remoto.

### 2.4 Shared (`packages/shared`)
- Tipos, DTOs, schemas Zod compartidos.

### 2.5 Persistencia (SQLite)
- Tablas: users, cameras, presets, settings.

### 2.6 Clean Architecture y dependencias

El gateway y la app web siguen una regla de dependencias hacia el núcleo:

```text
Dominio ← Aplicación ← Interfaces / Presentación
    ↑           ↑                 ↑
    └──── Infraestructura ────────┘
               Composition root
```

- **Dominio**: entidades y puertos (repositorios, hashing, tokens, probe y runtime de streams); no depende de frameworks ni de SQLite/FFmpeg.
- **Aplicación**: casos de uso/servicios; depende del dominio y de contratos compartidos, no de adaptadores concretos.
- **Interfaces**: rutas HTTP y guards; traducen solicitudes/respuestas y consumen servicios/puertos.
- **Infraestructura**: implementa puertos con SQLite, bcrypt, JWT, ffprobe/FFmpeg, HTTP y almacenamiento del navegador.
- **Composition roots** (`apps/gateway/src/app.ts` y `apps/web/src/composition.ts`): son el único lugar donde se conectan servicios con adaptadores concretos.
- **Frontend**: `App` y componentes son presentación; `AppService` consume el puerto `AppGateway`; `HttpAppGateway` y `BrowserTokenStorage` son adaptadores intercambiables.
- **Shared** contiene únicamente DTOs y esquemas de validación que cruzan el límite entre web y gateway; no contiene lógica de persistencia ni de infraestructura.

Las nuevas dependencias deben apuntar hacia estos puertos. No importar implementaciones de `infrastructure` desde `domain`, `application`, `interfaces` o `presentation`; realizar el cableado en el composition root.

## 3. Flujos principales

### 3.1 Ver stream
1. TV abre app → GET /api/cameras (lista).
2. Usuario selecciona cámara → frontend carga `<video src="/streams/:id/index.m3u8">`.
3. El gateway inicia FFmpeg al solicitar el stream y entrega HLS autenticado.
4. Reconexión automática en error de red.

### 3.2 Agregar cámara
1. POST /api/cameras con credenciales.
2. Gateway cifra credenciales, hace probe RTSP.
3. Si OK, guarda y retorna DTO (sin credenciales).

### 3.3 PTZ
1. POST /api/cameras/:id/ptz { action, speed }.
2. Gateway usa Tapo HTTP API (o ONVIF) para mover.

## 4. Despliegue

- Docker Compose: gateway privado + Nginx para frontend/proxy (puerto 8080 en LAN).
- O binario nativo en PC/Raspberry.

## 5. Escalabilidad

- Diseñado para 1 sitio, hasta ~16 cámaras.
- On-demand streams para limitar CPU.
- Una sola instancia de gateway por sitio.

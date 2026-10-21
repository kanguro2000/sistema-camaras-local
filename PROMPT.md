# PROMPT MAESTRO — Sistema de Visualización de Cámaras Tapo en TV

> Este documento es el prompt canónico que se debe entregar a cualquier agente de código (OpenCode, Cursor, Copilot, etc.) para generar, mantener o extender el proyecto **sistema-camaras-local**. Consérvalo como fuente de verdad de alto nivel. Detalles técnicos en `specs/`.

---

## 1. Visión del producto

Construir una aplicación **local-first** que permita ver en vivo, en una TV, el video de cámaras **TP-Link Tapo** instaladas en una vivienda/red local.

- **Usuarios objetivo**: dueño de casa con varias cámaras Tapo, TVs Hisense (Vidaa OS) y TCL (Android TV).
- **Caso de uso principal**: abrir la app en la TV, ver grid de cámaras en vivo, cambiar a pantalla completa, controlar PTZ en modelos que lo soporten, ver snapshot.
- **Sin dependencia de nube**: todo corre en la red local (LAN). No se envían streams a internet.
- **Baja latencia**: objetivo < 2 s entre cámara y TV.
- **Control por mando a distancia (D-pad)**: la UI debe ser 100% navegable con flechas/OK/back del control remoto.

## 2. Propuesta técnica (servidor intermedio + app web)

```
┌──────────────┐   RTSP    ┌─────────────────────────────┐   HLS/WebRTC   ┌──────────────┐
│ Cámara Tapo  │──────────▶│  Media Gateway (Node +       │───────────────▶│  Web App TV  │
│ (LAN)        │           │  mediamtx/ffmpeg)           │                │  (Hisense/   │
└──────────────┘           │  + API REST + Auth          │                │   TCL)       │
                           └─────────────────────────────┘                └──────────────┘
```

- **Servidor intermedio** (Media Gateway): corre en un PC/Raspberry/NAS de la red. Se conecta por RTSP a cada cámara, transcodifica/reempaqueta a HLS (y opcional WebRTC) y expone una API REST para gestión, auth, PTZ y snapshots.
- **App web**: frontend estático (React + Vite) servido por el gateway o por un servidor web. Se ejecuta en el navegador de la TV o empaquetada como app nativa (Vidaa .ipk / Android APK). Toda la comunicación con cámaras pasa por el gateway (las TVs nunca hablan RTSP directo).

## 3. Stack tecnológico (decisión base)

| Capa | Tecnología |
|------|-----------|
| Lenguaje backend | TypeScript (Node.js 20 LTS) |
| Framework API | Fastify (o Express) + Zod para validación |
| Base de datos | SQLite (better-sqlite3) para config/usuarios/cámaras |
| Media relay | mediamtx (binario) + ffmpeg para transcode audio |
| Auth | JWT (access + refresh) + bcrypt; modo "single user" por defecto |
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS + focus-visible para TV |
| Reproductor | hls.js (fallback nativo `<video>`) |
| Estado | Zustand |
| Testing | Vitest + Playwright (E2E web) |
| Empaquetado TV | Vidaa SDK (.ipk), Android (Capacitor o WebView nativo) |
| Contenedores | Docker Compose para el gateway |

Stack alternativo aprobado: Python/FastAPI + go2rtc si el equipo prefiere Python. La spec `specs/03-backend-api.md` define la interfaz; la implementación puede variar mientras cumpla el contrato.

## 4. Alcance (MVP → v1 → v2)

- **MVP (v0.1)**: listar cámaras, ver stream en vivo (HLS), fullscreen, grid 2x2, auth básica, agregar/editar/eliminar cámara, snapshot.
- **v1**: PTZ + presets, multi-usuario/roles, HTTPS opcional, app empaquetada Hisense Vidaa + Android TV, detección de desconexión/reconexión, audio (si soportado).
- **v2**: grabación local (DVR), detección de movimiento/notificaciones, multi-sitio, voz/alexa, integración ONVIF genérica.

## 5. Requisitos funcionales (resumen)

1. CRUD de cámaras (nombre, IP, modelo, credenciales, canal HD/SD, habilitada).
2. Stream en vivo por cámara (HLS; WebRTC opcional).
3. Vista grid configurable (1, 2x2, 3x3, 4x4) y vista única fullscreen.
4. PTZ (pan/tilt/zoom) y presets donde el modelo lo soporte.
5. Snapshot JPEG on-demand.
6. Gestión de usuarios y roles (admin/viewer).
7. Configuración de calidad (HD/SD) por cámara y por vista.
8. Estado de salud de cada stream (online/offline, bitrate, fps).
9. Navegación completa por control remoto.

## 6. Requisitos no funcionales

- Latencia end-to-end < 2 s (HLS con segmentos ≤ 1 s) o < 500 ms (WebRTC).
- Uso de CPU del gateway razonable: transcode solo si necesario; preferir copy (passthrough) cuando el codec es H.264/AAC compatible.
- Resiliencia: reconexión automática con backoff exponencial ante caída de cámara/red.
- Seguridad: credenciales cifradas en reposo (AES-256-GCM), TLS opcional, no exponer RTSP al exterior, rate limiting en API.
- Privacidad: sin telemetría, sin cloud.
- Accesibilidad TV: foco visible, tamaños grandes, contraste alto.

## 7. Convenciones del repositorio

- Monorepo con `apps/web`, `apps/gateway`, `packages/shared`.
- Código TypeScript estricto (`strict: true`), ESLint + Prettier.
- Commits convencionales (Conventional Commits).
- Tests unitarios para lógica; E2E para flujos críticos.
- Documentación en `specs/` y `docs/`. Código y docs en español (UI en español; identificadores en inglés).

## 8. Entregables esperados del agente

1. Estructura de monorepo + tooling (pnpm workspaces).
2. Gateway con API REST documentada (OpenAPI).
3. Frontend TV-optimizado.
4. Docker Compose para despliegue.
5. App empaquetada Hisense Vidaa + Android TV (o instrucciones de empaquetado).
6. Tests básicos + CI (GitHub Actions).
7. Actualización de `MEMORY.md` con decisiones tomadas.

## 9. Instrucciones para el agente

- Antes de implementar, leer `MEMORY.md` y `AGENTS.md`.
- Consultar `specs/` para contratos (API, datos, media pipeline).
- No introducir dependencias de nube ni telemetría.
- Priorizar compatibilidad de codec H.264 en TV.
- Mantener el gateway como única puerta de entrada a las cámaras.
- Cualquier cambio de arquitectura debe registrarse en `MEMORY.md` (sección Decisiones).

---

*Generado para el proyecto sistema-camaras-local. Versión 0.1 — 2026-10-21.*

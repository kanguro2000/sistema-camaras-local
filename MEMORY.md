# MEMORY — Memoria del proyecto sistema-camaras-local

> Memoria persistente para agentes y desarrolladores. Actualizar tras cada decisión importante. Fecha base: 2026-10-21.

## 1. Contexto del usuario

- Propietario de varias cámaras **TP-Link Tapo** en una vivienda.
- TVs disponibles: **Hisense** con sistema operativo **Vidaa** y **TCL** con **Android TV**.
- Objetivo: ver video en vivo de las cámaras en la TV.
- Propuesta aceptada por el usuario: **servidor intermedio + app web**.
- Entorno de desarrollo: Windows 11, repo en `C:\Repos\sistema-camaras-local`.
- Servidor de producción/LAN: laptop Lenovo G480 con Ubuntu (gateway + mediamtx en Docker).
- Sin git inicializado (ahora inicializado).

## 2. Decisiones de arquitectura (ADR)

### ADR-001 — Servidor intermedio obligatorio
- **Decisión**: Toda comunicación con cámaras pasa por un gateway local. Las TVs nunca acceden directo a RTSP.
- **Motivo**: TVs no soportan RTSP de forma fiable; centraliza credenciales, transcode y reconexión.
- **Estado**: Aceptada.

### ADR-002 — Protocolo de entrega a TV: HLS primario, WebRTC opcional
- **Decisión**: HLS con segmentos ≤ 1 s como protocolo base (máxima compatibilidad). WebRTC (WHEP) como opción de baja latencia para modelos que lo soporten.
- **Motivo**: HTML5 `<video>`/hls.js funciona en Vidaa y Android TV sin plugins.
- **Estado**: Aceptada.

### ADR-003 — Passthrough cuando sea posible
- **Decisión**: Si el stream de la cámara es H.264 + audio AAC/AAC-LC o sin audio, reempaquetar (copy) sin transcode. Transcodificar solo audio G.711/PCMU o video H.265 cuando la TV no soporte.
- **Motivo**: reducir CPU del gateway.
- **Estado**: Aceptada.

### ADR-004 — Stack base Node/TypeScript + mediamtx
- **Decisión**: Gateway en Node.js 20 + Fastify; relay con mediamtx; frontend React+Vite.
- **Alternativa**: Python/FastAPI + go2rtc (aprobada como equivalente si el equipo lo prefiere).
- **Estado**: Aceptada (base).

### ADR-005 — Almacenamiento local SQLite
- **Decisión**: SQLite para usuarios/cámaras/config. Sin DB externa en MVP.
- **Motivo**: despliegue simple en LAN.
- **Estado**: Aceptada.

### ADR-006 — Credenciales cifradas en reposo
- **Decisión**: AES-256-GCM con clave maestra en `.env` (`MASTER_KEY`). Nunca en claro en DB ni logs.
- **Estado**: Aceptada.

### ADR-007 — App web empaquetada por plataforma
- **Decisión**: Una sola codebase web. Empaquetado específico: Vidaa .ipk para Hisense, APK (WebView/ExoPlayer) para TCL Android.
- **Estado**: Aceptada (a implementar v1).

### ADR-008 — Dependencias invertidas y composición por puertos
- **Decisión**: El dominio define puertos; aplicación e interfaces dependen de esos contratos, mientras infraestructura implementa adaptadores. Gateway y web conectan dependencias en sus composition roots.
- **Alcance inicial**: autenticación (hasher y tokens), probe RTSP, stream runtime, rutas HLS, servicio web y almacenamiento de token del navegador.
- **Motivo**: aislar reglas de negocio de Fastify, JWT, bcrypt, SQLite, FFmpeg, `fetch` y `localStorage`; facilitar pruebas con dobles.
- **Estado**: En adopción incremental; aplicar la regla en cambios nuevos y ampliar tests reales de shared/web y linting en próximos pasos.

## 3. Restricciones y supuestos

- Red local (LAN). No se asume internet en runtime.
- Cámaras Tapo con **Camera Account** creado (usuario/contraseña RTSP) en la app Tapo.
- RTSP URL típica: `rtsp://<user>:<pass>@<ip>:554/stream1` (HD) y `stream2` (SD).
- Algunos modelos Tapo usan audio G.711; se transcodifica a AAC.
- TVs con navegador limitado: evitar JS moderno no soportado; usar bundles compatibles (target ES2019).
- Vidaa OS: apps web en Chromium; navegación por D-pad; teclas de control remoto mapeadas a keycodes estándar.

## 4. Glosario

- **Gateway / Media Gateway**: servicio intermedio que relay y gestiona cámaras.
- **Camera Account**: cuenta local de la cámara Tapo usada para RTSP.
- **HLS**: HTTP Live Streaming.
- **PTZ**: Pan-Tilt-Zoom.
- **Vidaa**: SO de TVs Hisense.
- **WHEP**: WebRTC-HTTP Egress Protocol.

## 5. Mapa de especificaciones

| Spec | Contenido |
|------|-----------|
| `specs/00-index.md` | Índice y convenciones |
| `specs/01-product-overview.md` | Producto, personas, casos de uso |
| `specs/02-architecture.md` | Arquitectura y componentes |
| `specs/03-backend-api.md` | API REST, endpoints, modelos |
| `specs/04-media-pipeline.md` | Pipeline de media, codecs, latencia |
| `specs/05-tapo-integration.md` | Integración Tapo (RTSP, PTZ, snapshot) |
| `specs/06-frontend-tv-app.md` | Frontend, navegación TV, vistas |
| `specs/07-hisense-vidaa.md` | Empaquetado Hisense Vidaa |
| `specs/08-tcl-android.md` | Empaquetado TCL Android TV |
| `specs/09-security-privacy.md` | Seguridad y privacidad |
| `specs/10-deployment-ops.md` | Despliegue y operación |
| `specs/11-testing-quality.md` | Testing y calidad |

## 6. Decisiones pendientes / abiertas

- [ ] Elegir entre mediamtx vs go2rtc como relay principal (probar latencia en hardware real).
- [ ] Definir si el frontend se sirve desde el gateway o desde servidor estático separado.
- [ ] Confirmar soporte de WebRTC en Vidaa (versión del Chromium embebido).
- [ ] Decidir empaquetado Android: Capacitor vs app nativa WebView+ExoPlayer.
- [ ] Definir política de grabación (DVR) para v2.

## 7. Historial de cambios

- 2026-10-21: Creación inicial de memoria y documentación base (PROMPT, AGENTS, specs, skills).

---

*Actualizar este archivo en cada PR que cambie arquitectura o decisiones.*

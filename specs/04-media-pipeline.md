# Spec 04 — Media Pipeline

## 1. Objetivo

Entregar video en vivo de cámaras Tapo a TVs con latencia < 2 s (HLS) manteniendo CPU razonable.

## 2. Pipeline

```
Cámara (RTSP H.264 + audio)
   │
   ▼
Gateway inicia FFmpeg bajo demanda
   │
   ├── video: passthrough (copy)
   └── audio: AAC
   │
   ▼
HLS segments (1 s) + playlist m3u8
   │
   ▼
Gateway autenticado → Nginx proxy → TV (hls.js / native)
```

El despliegue actual no usa MediaMTX y no transcodifica H.265 a H.264; esos escenarios requieren validación y una tarea posterior. La ruta de video usa passthrough, por lo que la cámara debe entregar un codec compatible con la TV.

## 3. Configuración HLS

- Segment duration: 1 s.
- Playlist size: 3 segments (ventana deslizante).
- LL-HLS no está habilitado en el pipeline actual.
- Atributos: `#EXT-X-VERSION:7` si LL-HLS.

## 4. On-demand

- Streams arrancan al primer viewer y se detienen tras N segundos sin viewers (configurable, default 30 s).
- Evita consumo CPU con cámaras no vistas.

## 5. Reconexión

- Backoff exponencial: 1 s, 2 s, 4 s, 8 s, 16 s, max 30 s.
- Tras reconexión exitosa, reset backoff.
- Estado reportado en health endpoint y UI.

## 6. Codecs y compatibilidad TV

- Video preferido: H.264 (AVC) High/Main profile, hasta 1080p.
- Audio preferido: AAC-LC. Si cámara envía G.711/PCMU, transcodificar a AAC.
- Evitar H.265/HEVC en MVP (soporte desigual en Vidaa).
- Resolución: usar stream HD (stream1) o SD (stream2) según config.

## 7. WebRTC (opcional, v1)

- WHEP endpoint por cámara para latencia < 500 ms.
- Requiere integrar MediaMTX u otro relay compatible; aún no implementado.
- Fallback a HLS si WebRTC falla.

## 8. Métricas

- fps, bitrate, dropped frames por stream.
- CPU/memoria del gateway expuestos en `/api/metrics` (Prometheus opcional).

## 9. Límites

- Máximo 16 streams concurrentes en hardware típico (PC/Raspberry 4).
- Si se supera, degradar a SD automáticamente.

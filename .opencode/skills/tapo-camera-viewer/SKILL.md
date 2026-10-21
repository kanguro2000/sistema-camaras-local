---
name: tapo-camera-viewer
description: Guía para integrar y depurar cámaras TP-Link Tapo (RTSP, PTZ, snapshot, modelos) en el sistema de visualización. Usar al trabajar con cámaras Tapo, streams RTSP, PTZ o snapshots.
---

# Skill: Tapo Camera Viewer

## Cuándo usar
- Agregar soporte a un modelo Tapo nuevo.
- Depurar stream RTSP que no conecta.
- Implementar PTZ o snapshot.
- Detectar capacidades (PTZ, audio, codec).

## Pasos clave

### 1. Crear Camera Account
En app Tapo: cámara → Ajustes → Avanzado → Cuenta de cámara. Sin esto no hay RTSP.

### 2. URL RTSP
```
rtsp://<user>:<pass>@<ip>:554/stream1   # HD
rtsp://<user>:<pass>@<ip>:554/stream2   # SD
```
Preferir transporte TCP.

### 3. Probe
- Conectar con timeout 10 s.
- Leer SDP, detectar codec video/audio.
- Si H.265 o audio G.711 → marcar para transcode.

### 4. PTZ
- Intentar Tapo HTTP API o ONVIF.
- Acciones: up/down/left/right/zoomin/zoomout/home/preset.
- Velocidad 1-8.

### 5. Snapshot
- Preferir endpoint de cámara; fallback decodificar frame RTSP.
- Cachear 1-2 s.

## Errores comunes
- "401 Unauthorized": Camera Account incorrecto o no creado.
- Stream se corta: inactividad; usar keepalive/on-demand.
- Sin audio: modelo no envía audio o codec incompatible.
- PTZ no responde: modelo sin PTZ o firmware antiguo.

## Checklist
- [ ] Probe exitoso.
- [ ] Codec detectado y documentado.
- [ ] PTZ probado (si aplica).
- [ ] Snapshot probado.
- [ ] Reconexión probada.

# Spec 05 — Integración Tapo

## 1. Requisitos previos (usuario)

1. Instalar app Tapo, agregar cámara.
2. Crear **Camera Account** (Cuenta de cámara): app Tapo → cámara → Ajustes → Avanzado → Cuenta de cámara → definir usuario/contraseña.
3. Anotar IP de la cámara (reservar DHCP en router recomendado).

## 2. RTSP

- URL HD: `rtsp://<user>:<pass>@<ip>:554/stream1`
- URL SD: `rtsp://<user>:<pass>@<ip>:554/stream2`
- Puerto por defecto 554 (algunos modelos 554; verificar).
- Algunos modelos requieren `?transport=tcp` (interleaved) por firewall; preferir TCP.

## 3. Probe de conectividad

El gateway debe, al agregar/editar cámara:
1. Intentar conectar RTSP (con timeout 10 s).
2. Leer SDP / primer frame.
3. Detectar codec de video/audio.
4. Guardar `ptzSupported` y capacidades.

## 4. PTZ (modelos PTZ)

Opciones:
- **Tapo HTTP API** (protocolo TP-Link): login RSA+AES, endpoints de control. Librerías: `pytapo` (Python), `node-tapo-camera` (Node).
- **ONVIF** si el modelo lo soporta (puerto 2020/80).

Acciones mínimas: up/down/left/right/zoomin/zoomout/home/preset.

Mapeo de velocidad: 1-8 (Tapo). Exponer en API como `speed: 1..8`.

## 5. Snapshot

- Vía RTSP (decodificar un frame) o vía Tapo HTTP API (`getSnapshot` o endpoint `/snapshot`).
- Retornar JPEG, caché corto (1-2 s) para no saturar.

## 6. Modelos compatibles (referencia)

Modelos del usuario (a validar en probe):
- Tapo C510W V1 (exterior, PTZ probable).
- Tapo TC42 V2 (interior, PTZ probable).
- Tapo C520WS V2 (exterior, PTZ).
- Tapo C200 (interior, PTZ).

Otros:
- Tapo C100/C110/C200 (interior, PTZ en C200).
- Tapo C310/C320WS (exterior).
- Tapo C500/C520WS (PTZ exterior).
- Tapo TC60/TC70.

Nota: capacidades (PTZ, audio, codec) se detectan dinámicamente en el probe; no asumir.

Nota: capacidades varían; el gateway debe detectar PTZ y audio dinámicamente.

## 7. Limitaciones conocidas

- Sin Camera Account, RTSP no está disponible.
- Algunos modelos cortan RTSP tras inactividad; on-demand con keepalive.
- Audio puede ser G.711; transcodificar.
- Tapo HTTP API cambia entre firmware; preferir ONVIF cuando esté disponible.

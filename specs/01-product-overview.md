# Spec 01 — Product Overview

## 1. Problema

El usuario tiene varias cámaras Tapo y quiere verlas en vivo en sus TVs (Hisense Vidaa, TCL Android). Las apps oficiales de Tapo no ofrecen una experiencia de "videowall" en TV, y las TVs no reproducen RTSP de forma nativa/fiable.

## 2. Solución

App local (servidor intermedio + web app) que centraliza los streams y los entrega en HLS/WebRTC a la TV, con UI optimizada para control remoto.

## 3. Personas

- **Owner (admin)**: configura cámaras, usuarios, calidad.
- **Viewer (familiar)**: solo visualiza, sin editar.

## 4. Casos de uso principales

- UC-01 Ver grid de cámaras en vivo al abrir la app.
- UC-02 Ampliar una cámara a pantalla completa.
- UC-03 Cambiar calidad HD/SD por cámara.
- UC-04 Controlar PTZ (modelos PTZ).
- UC-05 Capturar snapshot.
- UC-06 Agregar/editar/eliminar cámara.
- UC-07 Gestionar usuarios.
- UC-08 Ver estado de salud de streams.

## 5. Requisitos funcionales

- RF-01 CRUD de cámaras (nombre, IP, modelo, credenciales, canal, habilitada).
- RF-02 Stream en vivo por cámara (HLS; WebRTC opcional).
- RF-03 Vistas: 1, 2x2, 3x3, 4x4 y fullscreen.
- RF-04 PTZ + presets donde soporte.
- RF-05 Snapshot JPEG on-demand.
- RF-06 Usuarios y roles (admin/viewer).
- RF-07 Calidad configurable por cámara/vista.
- RF-08 Estado de salud (online/offline, fps, bitrate).
- RF-09 Navegación 100% por control remoto.

## 6. Requisitos no funcionales

- RNF-01 Latencia end-to-end < 2 s (HLS) / < 500 ms (WebRTC).
- RNF-02 CPU gateway razonable (passthrough preferente).
- RNF-03 Reconexión automática con backoff exponencial.
- RNF-04 Credenciales cifradas en reposo (AES-256-GCM).
- RNF-05 TLS opcional; sin exposición de RTSP.
- RNF-06 Rate limiting en API.
- RNF-07 Sin telemetría/cloud.
- RNF-08 Accesibilidad TV (foco visible, tamaños grandes).

## 7. Scope MVP (v0.1)

Incluye: RF-01, RF-02, RF-03 (hasta 2x2), RF-05, RF-06 (single user), RF-08 básico, RF-09.
Excluye: PTZ, WebRTC, grabación, notificaciones (v1/v2).

## 8. Métricas de éxito

- Tiempo hasta ver primera cámara < 30 s tras abrir app.
- 0 caídas silenciosas (todo stream muestra estado).
- Funciona en Hisense Vidaa y TCL Android TV.

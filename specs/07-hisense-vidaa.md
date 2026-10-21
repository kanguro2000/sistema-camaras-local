# Spec 07 — Hisense Vidaa

## 1. Plataforma

- Vidaa OS: Linux + Chromium embebido.
- Apps web empaquetadas (.ipk) vía Vidaa Developer SDK.
- Navegación por control remoto D-pad.

## 2. Consideraciones

- Versión de Chromium puede ser antigua → target ES2019, evitar APIs modernas no soportadas.
- WebRTC puede no estar disponible → HLS como base.
- Almacenamiento local limitado → no guardar video local.
- Teclas del control remoto: mapear keycodes (Arrow*, Enter, Backspace/Escape). Probar en TV real.

## 3. Empaquetado

- Crear cuenta en Vidaa Developer, registrar app.
- Manifest de app (nombre, icono, entrypoint).
- Empaquetar con Vidaa SDK → .ipk.
- Instalar vía USB o portal developer.
- Actualización: subir nueva versión al portal.

## 4. Limitaciones

- Sin acceso a APIs nativas de cámara/micrófono (no necesario).
- Políticas de autoplay: muted por defecto.
- CORS: gateway debe permitir origin de la app Vidaa.

## 5. Testing en TV real

- Verificar foco, scroll, reproducción HLS, reconexión.
- Documentar keycodes observados en este archivo.

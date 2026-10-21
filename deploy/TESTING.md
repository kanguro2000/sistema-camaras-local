# Checklist de prueba en Ubuntu (Lenovo G480)

## 1. Preparación
- [ ] Docker y ffmpeg instalados (`docker --version`, `ffmpeg -version`).
- [ ] `.env` configurado (MASTER_KEY, JWT_SECRET, ADMIN_PASSWORD).
- [ ] `docker compose up -d --build` sin errores.
- [ ] `curl http://localhost:8080/api/health` responde ok.

## 2. Cámaras (Camera Account creado en app Tapo)
Modelos a probar: C510W V1, TC42 V2, C520WS V2, C200.

Para cada cámara:
- [ ] Agregar vía API/UI (nombre, IP, usuario, contraseña, canal HD).
- [ ] `POST /api/cameras/:id/probe` → codecVideo/codecAudio reportados.
- [ ] `GET /api/cameras/:id/stream` → hlsUrl.
- [ ] Reproducir HLS en VLC o navegador (`http://<ip>:8080/streams/<id>/index.m3u8`).
- [ ] Latencia medida < 2 s.
- [ ] Estabilidad 30 min sin caídas.

## 3. Funcionalidad
- [ ] Login admin funciona.
- [ ] CRUD cámaras (crear, editar, eliminar).
- [ ] Grid en frontend muestra cámaras.
- [ ] Fullscreen funciona.
- [ ] Reconexión tras apagar/encender cámara.

## 4. TVs
- [ ] Hisense Vidaa: abrir URL del frontend, navegar con D-pad.
- [ ] TCL Android: abrir URL, reproducir HLS.

## 5. Problemas comunes
- Probe falla → verificar Camera Account y IP.
- Sin audio → codec G.711, transcode a AAC (ya configurado).
- Stream no arranca → verificar ffmpeg instalado y logs del gateway.
- Alta CPU → usar canal SD o reducir cámaras simultáneas.

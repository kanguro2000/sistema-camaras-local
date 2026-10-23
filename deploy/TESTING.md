# Checklist de prueba en Ubuntu (Lenovo G480)

## 1. Preparación
- [ ] Docker y Docker Compose instalados (`docker info`, `docker compose version`).
- [ ] `.env` configurado (MASTER_KEY, JWT_SECRET, ADMIN_PASSWORD).
- [ ] `bash deploy/ubuntu-setup.sh` termina correctamente y muestra health `ok`.
- [ ] `curl --fail http://localhost:8080/api/health` responde ok.
- [ ] Interfaz web disponible en `http://localhost:8080`.
- [ ] Solo el puerto 8080 está publicado por Compose; no reenviarlo desde el router a Internet.

## 2. Cámaras (Camera Account creado en app Tapo)
Modelos a probar: C510W V1, TC42 V2, C520WS V2, C200.

Para cada cámara:
- [ ] Agregar vía API/UI (nombre, IP, usuario, contraseña, canal HD).
- [ ] `POST /api/cameras/:id/probe` → codecVideo/codecAudio reportados.
- [ ] `GET /api/cameras/:id/stream` → hlsUrl.
- [ ] Reproducir HLS desde la interfaz (los recursos requieren la cookie HttpOnly; no abrir la URL sin autenticar).
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
- Stream no arranca → revisar `docker compose logs gateway`; FFmpeg se instala en la imagen.
- Alta CPU → usar canal SD o reducir cámaras simultáneas.

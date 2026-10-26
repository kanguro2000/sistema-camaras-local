# Spec 11 — Testing y Calidad

## 1. Niveles

- **Unit**: lógica de dominio, cifrado y validación con el test runner de Node.js.
- **E2E web**: flujos en navegador con Playwright: login, videowall/fullscreen y administración CRUD usando respuestas de API simuladas.
- **Manual TV**: checklist en TV real (Hisense/TCL).

El comando canónico `pnpm test` ejecuta las pruebas de los paquetes y, al terminar, la suite Playwright. Para ejecutar solo la suite de navegador: `pnpm test:e2e`. Playwright levanta Vite en `127.0.0.1:4173`; las rutas del gateway se simulan y no requieren cámara ni Docker.

## 2. Cobertura mínima

- Backend: ≥ 70% líneas en módulos de dominio.
- Frontend: ≥ 60% en stores/utils.

## 3. CI (GitHub Actions)

- El workflow `.github/workflows/ci.yml` ejecuta lint, typecheck, `pnpm test` y build en push y pull request.
- CI usa Node.js 24, de acuerdo con `package.json` y la spec de despliegue.
- Instala Chromium de Playwright; las pruebas E2E usan un gateway simulado y no requieren Docker ni cámaras reales.
- La construcción de imágenes Docker queda fuera de este workflow de validación.

## 4. Mocks de cámara

- Los E2E web actuales simulan las rutas HTTP del gateway y abortan las solicitudes de segmentos HLS; validan flujos y UI, no el pipeline real de video.
- Para pruebas futuras de integración del pipeline, usar un servidor RTSP mock (mediamtx con archivo de video).
- No depender de hardware real en CI.

## 5. Checklist manual TV

- [ ] App abre en < 5 s.
- [ ] Grid muestra streams.
- [ ] Fullscreen funciona.
- [ ] D-pad navega todo.
- [ ] Reconexión tras apagar/encender cámara.
- [ ] Sin crash tras 30 min.

## 6. Calidad de código

- ESLint + Prettier.
- Husky pre-commit (lint-staged).
- Conventional Commits.

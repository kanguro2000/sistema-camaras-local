# Spec 11 — Testing y Calidad

## 1. Niveles

- **Unit**: lógica de dominio, cifrado, validación (Vitest).
- **Integration**: API endpoints con DB en memoria (Vitest + supertest).
- **E2E**: flujos web con Playwright (login, ver stream mock, CRUD cámara).
- **Manual TV**: checklist en TV real (Hisense/TCL).

## 2. Cobertura mínima

- Backend: ≥ 70% líneas en módulos de dominio.
- Frontend: ≥ 60% en stores/utils.

## 3. CI (GitHub Actions)

- Lint + typecheck + tests en PR.
- Build de imágenes Docker.
- (Opcional) E2E contra gateway mock.

## 4. Mocks de cámara

- Usar un servidor RTSP mock (mediamtx con archivo de video) para tests E2E.
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

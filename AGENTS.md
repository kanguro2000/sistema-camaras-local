# AGENTS.md — Guía para agentes de código

> Leé esto antes de tocar el código. Aplica a todos los agentes (OpenCode, Cursor, Copilot, etc.).

## 1. Roles

- **Architect**: diseña cambios estructurales; actualiza `specs/` y `MEMORY.md`.
- **Backend Dev**: gateway Node/TypeScript, API, media pipeline.
- **Frontend Dev**: app React TV-optimizada.
- **TV Packager**: empaquetado Vidaa/Android.
- **QA**: tests, E2E, validación en TV real.

Un mismo agente puede cumplir varios roles, pero debe respetar los contratos de `specs/`.

## 2. Flujo de trabajo

1. Leer `PROMPT.md`, `MEMORY.md`, `AGENTS.md` y la spec relevante.
2. Planificar cambios (lista de archivos a tocar).
3. Implementar en ramas feature (`feat/<scope>`).
4. Escribir/actualizar tests.
5. Actualizar `MEMORY.md` si hubo decisión de arquitectura.
6. Abrir PR con descripción y checklist.

## 3. Convenciones de código

- TypeScript estricto (`"strict": true`), sin `any` implícito.
- ESLint + Prettier (config en raíz). Formato antes de commit.
- Nombres: archivos `kebab-case`, componentes React `PascalCase`, funciones/variables `camelCase`, constantes `UPPER_SNAKE`.
- Identificadores en inglés; UI y docs en español.
- Commits convencionales: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

## 4. Estructura del monorepo

```
sistema-camaras-local/
├── apps/
│   ├── gateway/        # Node.js media gateway + API
│   └── web/            # React frontend (Vite)
├── packages/
│   └── shared/         # Tipos, DTOs, validación Zod compartida
├── deploy/             # docker-compose, nginx, scripts
├── specs/              # Especificaciones
├── skills/             # SKILL.md para agentes
├── .opencode/skills/   # Skills descubribles por OpenCode
├── PROMPT.md
├── MEMORY.md
└── AGENTS.md
```

## 5. Reglas críticas (no negociables)

1. **Nunca** exponer credenciales de cámara en logs, respuestas API o frontend. Siempre cifradas/mascaradas.
2. **Nunca** enviar streams a internet por defecto. Todo local.
3. **Nunca** hardcodear IPs/credenciales; usar config/DB.
4. El gateway es la **única** puerta de entrada a las cámaras.
5. Mantener compatibilidad H.264 para TV; no asumir H.265.
6. UI debe ser navegable 100% con D-pad (sin mouse).
7. No introducir telemetría ni analytics externos.

## 6. Testing mínimo antes de PR

- Unit tests del módulo tocado pasan.
- `pnpm lint` y `pnpm typecheck` sin errores.
- Para cambios de media pipeline: prueba manual de stream en al menos una cámara.
- Para cambios de UI TV: verificar navegación por teclado (flechas/Enter/Escape).

## 7. Cómo agregar una cámara (flujo de referencia)

1. Usuario crea Camera Account en app Tapo.
2. En la app web: Configuración → Cámaras → Agregar: nombre, IP, usuario, contraseña, canal (HD/SD).
3. Gateway valida conectividad RTSP (probe) y guarda cifrado.
4. Stream disponible en `/streams/:cameraId/index.m3u8`.

## 8. Skills disponibles

- `skills/tapo-camera-viewer/SKILL.md` — guía para trabajar con cámaras Tapo.
- `skills/tv-remote-navigation/SKILL.md` — patrones de navegación por control remoto.

Cargar el skill correspondiente antes de tareas especializadas.

## 9. Contacto / escalamiento

Decisiones de arquitectura → actualizar `MEMORY.md` (ADR) y notificar al owner.
Problemas de hardware/TV real → documentar en `specs/07-hisense-vidaa.md` / `08-tcl-android.md`.

# Sistema de Cámaras Local — Tapo en TV

Visualización en vivo de cámaras TP-Link Tapo en TVs Hisense (Vidaa) y TCL (Android TV), mediante un servidor intermedio (gateway) + app web.

## Documentación

- `PROMPT.md` — prompt maestro del proyecto.
- `MEMORY.md` — memoria y decisiones (ADR).
- `AGENTS.md` — guía para agentes de código.
- `specs/` — especificaciones técnicas.
- `skills/` — skills para agentes.

## Inicio rápido (cuando el código esté implementado)

```bash
pnpm install
cp .env.example .env   # editar MASTER_KEY, JWT_SECRET
pnpm dev               # gateway + web
```

Despliegue: ver `specs/10-deployment-ops.md`.

## Estado

Documentación base creada. Implementación pendiente (MVP v0.1).

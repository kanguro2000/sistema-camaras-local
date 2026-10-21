# Sistema de Cámaras Local — Tapo en TV

Visualización en vivo de cámaras TP-Link Tapo en TVs Hisense (Vidaa) y TCL (Android TV), mediante un servidor intermedio (gateway) + app web.

## Documentación

- `PROMPT.md` — prompt maestro del proyecto.
- `MEMORY.md` — memoria y decisiones (ADR).
- `AGENTS.md` — guía para agentes de código.
- `specs/` — especificaciones técnicas.
- `skills/` — skills para agentes.

## Inicio rápido (desarrollo)

```bash
pnpm install
cp .env.example .env   # editar MASTER_KEY, JWT_SECRET, ADMIN_PASSWORD
pnpm dev               # gateway + web
```

## Despliegue en Ubuntu (Lenovo G480)

```bash
cd deploy
bash ubuntu-setup.sh
```

Ver `deploy/TESTING.md` para la checklist de validación.

Despliegue manual: ver `specs/10-deployment-ops.md`.

## Estado

Documentación base creada. Implementación pendiente (MVP v0.1).

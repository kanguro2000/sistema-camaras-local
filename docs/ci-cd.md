# Flujo de ramas, CI/CD y despliegue

## 1. Ramas

```text
feature/* ──PR──> develop ──PR──> staging ──PR──> master
```

| Rama      | Propósito                       | Etiqueta de imagen |
| --------- | ------------------------------- | ------------------ |
| `develop` | Integración continua de cambios | `develop`          |
| `staging` | Validación previa a producción  | `staging`          |
| `master`  | Producción (estable)            | `latest`           |

Reglas:

- El trabajo nuevo se hace en ramas `feat/*`, `fix/*`, `docs/*`, etc. creadas desde `develop` y se integra con PR hacia `develop`.
- Solo se promueve `develop` → `staging` → `master`. Un PR hacia `staging` debe venir de `develop` y uno hacia `master` de `staging`. El job `branch-flow` falla en otro caso. Las ramas `hotfix/*` están exentas para emergencias.
- Usa **merge commit** en los PR de promoción para conservar el historial entre ramas.
- Dependabot abre sus PR contra `develop`.

## 2. CI (`.github/workflows/ci.yml`)

| Job              | Cuándo                                     | Qué hace                                                                             |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `branch-flow`    | PR hacia `develop`, `staging` o `master`   | Verifica el origen permitido del PR.                                                 |
| `validate`       | PR y push a las tres ramas                 | Instala, lint, typecheck, pruebas unitarias y E2E, build.                            |
| `deploy-checks`  | PR y push a las tres ramas                 | ShellCheck de `deploy/*.sh`, `docker compose config` y build de las imágenes Docker. |
| `publish-images` | Solo push (tras fusionar) a las tres ramas | Publica `gateway` y `web` en GHCR con la etiqueta del ambiente y `sha-<commit>`.     |
| `promote`        | Push a `develop` o `staging`               | Abre el PR de promoción a la rama siguiente si hay cambios y no existe uno abierto.  |

`publish-images` y `promote` solo se ejecutan si `validate` y `deploy-checks` pasan.

## 3. Imágenes y despliegue manual

Las imágenes se publican en:

- `ghcr.io/<owner>/sistema-camaras-gateway:<etiqueta>`
- `ghcr.io/<owner>/sistema-camaras-web:<etiqueta>`

Cada ambiente se despliega con un comando desde la raíz del repositorio en el servidor. `IMAGE_TAG` elige el ambiente (`develop`, `staging` o `latest`); para fijar una versión exacta usa `sha-<commit>`.

```bash
export IMAGE_TAG=staging
sudo -E docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.images.yml pull
sudo -E docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.images.yml up -d --no-build
curl --fail --silent --show-error http://localhost:8080/api/health
```

Si los paquetes de GHCR son privados, inicia sesión antes en el servidor con un token personal con permiso `read:packages`:

```bash
echo "$GHCR_TOKEN" | sudo docker login ghcr.io -u <usuario> --password-stdin
```

Para volver a una versión anterior, repite el comando con `IMAGE_TAG=sha-<commit-anterior>`. Haz respaldo antes de cambiar de versión (ver [runbook](./operations-runbook.md)).

## 4. Configuración requerida en GitHub

No se puede aplicar desde el repositorio; hazlo en **Settings**:

1. **Actions → General → Workflow permissions**: activar _Allow GitHub Actions to create and approve pull requests_ (necesario para `promote`).
2. **Rules → Rulesets** (o Branch protection) para `develop`, `staging` y `master`:
   - Exigir PR antes de fusionar y bloquear force-push y borrado.
   - Exigir los checks `validate`, `deploy-checks` y `branch-flow`.
   - Exigir que la rama esté actualizada antes de fusionar.
3. **General → Pull Requests**: activar _Automatically delete head branches_ (no afecta a `develop` y `staging`, que están protegidas).
4. **Packages**: tras la primera publicación, enlazar o ajustar la visibilidad de los paquetes de GHCR según prefieras.
5. Cambiar la rama por defecto a `develop` si quieres que los PR nuevos apunten allí de forma predeterminada.

## 5. Limitaciones conocidas

- El despliegue no es automático: el servidor está en la LAN y GitHub no puede alcanzarlo. Si más adelante se instala un runner self-hosted, se puede añadir un job de despliegue por rama con un _environment_ y aprobación manual para `master`.
- Los PR creados con `GITHUB_TOKEN` no disparan nuevos workflows. Los checks del PR de promoción son los del push que lo originó, porque comparten el mismo commit.

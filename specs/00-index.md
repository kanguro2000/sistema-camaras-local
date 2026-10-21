# Specs Index — sistema-camaras-local

Convenciones:
- Los archivos `specs/*.md` son la fuente de verdad técnica.
- Numeración `NN-tema.md`. No renumerar sin actualizar referencias.
- Cambios de contrato (API, datos) requieren actualizar spec y tests.

## Índice

| # | Archivo | Contenido |
|---|---------|-----------|
| 00 | `00-index.md` | Este índice |
| 01 | `01-product-overview.md` | Producto, personas, casos de uso, scope |
| 02 | `02-architecture.md` | Arquitectura, componentes, flujos |
| 03 | `03-backend-api.md` | API REST, endpoints, DTOs, errores |
| 04 | `04-media-pipeline.md` | Pipeline de media, codecs, latencia, reconexión |
| 05 | `05-tapo-integration.md` | Integración Tapo: RTSP, PTZ, snapshot, modelos |
| 06 | `06-frontend-tv-app.md` | Frontend, vistas, navegación TV, estado |
| 07 | `07-hisense-vidaa.md` | Empaquetado y particularidades Hisense Vidaa |
| 08 | `08-tcl-android.md` | Empaquetado y particularidades TCL Android TV |
| 09 | `09-security-privacy.md` | Seguridad, privacidad, cifrado |
| 10 | `10-deployment-ops.md` | Despliegue, operación, monitoreo |
| 11 | `11-testing-quality.md` | Testing, calidad, CI |

## Convenciones de escritura

- RF-XX = Requisito Funcional.
- RNF-XX = Requisito No Funcional.
- ADR-XXX = Architecture Decision Record (en MEMORY.md).
- Endpoints en formato `METHOD /path`.
- DTOs en TypeScript/Zod.

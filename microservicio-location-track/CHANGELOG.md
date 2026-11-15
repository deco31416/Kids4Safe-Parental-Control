# Changelog - Location Track Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## Mantenimiento anterior — 2026-08-19

### Reliability

- Corregido el falso estado `healthy` cuando MongoDB está desconectado.
- `GET /health` devuelve HTTP 503 durante degradación.
- Añadidas las primeras dos pruebas automatizadas del servicio para readiness.
- Migrada la configuración local a `.env.local` mediante Pydantic Settings 2.

## [0.1.2] - 2026-06-12

### Configuration

- Aligned Railway environment example with the current backend URL and shared `ADMIN_API_KEY`.
- Hardened `.gitignore` coverage for secrets, certificates, local dumps, logs, caches and temporary artifacts.
- Updated FastAPI metadata version to `3.0.1`.

---

## [0.1.1] - 2026-06-10

### Maintenance

- Added `README.md` with service purpose, port and local setup.
- Added `.gitignore` for Python caches, virtual environments, logs and local environment files.

---

## [0.1.0] - 2026-06-08

### Initial

- Base FastAPI service for location track operations.

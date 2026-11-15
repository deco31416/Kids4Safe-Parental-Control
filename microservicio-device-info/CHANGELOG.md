# Changelog - Device Info Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## Mantenimiento anterior — 2026-08-19

- `GET /health` devuelve HTTP 503 cuando Redis no está disponible.
- Añadida regresión automatizada de readiness; suite actual 12/12.
- Migrada la configuración local de `.env` a `.env.local` y añadida plantilla sin secretos.

## [0.1.3] - 2026-08-18

### Security

- Removed secret-like values and credential-shaped URLs from Railway examples.
- Made administrative authentication fail closed and use constant-time comparison.
- Protected the legacy device lookup route with the same API key as the canonical API.
- Stopped logging Redis connection URLs and added bounded connection timeouts.

### Reliability

- Added Redis lifecycle cleanup, truthful degraded health status and UTC timestamps.
- Replaced deprecated Redis `SETEX` usage with `SET EX` while preserving the TTL.
- Moved synchronous Redis work to FastAPI worker threads through synchronous handlers.
- Unified canonical and compatibility lookup routes on `device_context:{session_id}`.
- Added payload size/range validation and corrected iPad/tablet classification order.
- Added automated tests for authentication, aliases, validation, Redis TTL and parsing.

## [0.1.2] - 2026-06-12

### Configuration

- Aligned Railway environment example with the current backend URL and shared `ADMIN_API_KEY`.
- Hardened `.gitignore` coverage for secrets, certificates, local dumps, logs, caches and temporary artifacts.
- Updated FastAPI metadata version to `3.0.1`.

---

## [0.1.1] - 2026-06-10

### Maintenance

- Added `README.md` with service purpose, port and local setup.
- Updated `.gitignore` for Python caches, virtual environments, logs and local environment files.

---

## [0.1.0] - 2026-06-08

### Initial

- Base FastAPI service for device context operations.

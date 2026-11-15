# Changelog - Audit Log Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## Mantenimiento anterior — 2026-08-19

- `GET /health` devuelve HTTP 503 cuando MongoDB no está disponible.
- Añadida regresión automatizada de readiness; suite actual 8/8.
- Migrada la configuración local de `.env` a `.env.local` y añadida plantilla sin secretos.

## [3.0.2] - 2026-08-18

### Security

- Removed a secret-like API key from the Railway example and required explicit admin authentication configuration.
- Replaced direct API-key comparison with constant-time comparison.
- Restricted CORS origins, methods and headers.
- Prevented MongoDB credentials and internal exception details from reaching logs or clients.
- Updated FastAPI, Starlette, Uvicorn, Pydantic, PyMongo and python-dotenv to audited compatible releases.

### Reliability

- Fixed invalid PyMongo collection truth-value checks.
- Added bounded MongoDB connection timeouts and lifecycle cleanup.
- Moved synchronous PyMongo endpoints to FastAPI's worker thread execution model.
- Added validation limits for identifiers, metadata and geographic values.

### Testing

- Added security, validation and endpoint regression tests.

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

- Base FastAPI service for audit log operations.

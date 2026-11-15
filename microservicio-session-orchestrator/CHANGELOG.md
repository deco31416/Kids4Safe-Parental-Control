# Changelog - Session Orchestrator Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## Mantenimiento anterior — 2026-08-20

### Maintenance

- Migrada la configuración local de `.env` a `.env.local` mediante Pydantic Settings 2.
- Alineada la plantilla segura con la versión 3.1.0, Redis y la API key compartida.
- Añadidos requirements de desarrollo para pytest y pip-audit.

## [3.1.0] - 2026-08-18

### Security

- Added fail-closed constant-time API-key authentication.
- Removed wildcard CORS and sensitive Redis URL logging.
- Added strict request validation and bounded identifiers, URLs and locations.
- Removed real-looking secrets from environment examples.

### Reliability

- Isolated keys under `orchestrator:session:*` to prevent backend Redis collisions.
- Added asynchronous Redis lifecycle and optimistic transactional updates.
- Added liveness and Redis-backed readiness endpoints.
- Batched active-session reads and bounded scan results.

### Architecture

- Split the 294-line monolith into focused modules below 150 lines.
- Added unit tests for models, authentication, API contract and Redis behavior.
- Documented reproducible secure tooling versions (`pip 26.1.2`, `setuptools 83.0.0`).

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

- Base FastAPI service for session orchestration operations.

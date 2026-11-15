# Changelog - Location & Geofence Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## Mantenimiento anterior — 2026-08-19

- `GET /health` devuelve HTTP 503 cuando Redis no está disponible.
- Añadida regresión automatizada de readiness; suite actual 18/18.
- Migrada la configuración local de `.env` a `.env.local` y añadida plantilla sin secretos.

## [3.1.0] - 2026-08-18

### Security

- Protected every endpoint that reads or writes coordinates with fail-closed authentication.
- Removed secret-like values and credential-shaped URLs from deployment examples.
- Removed automatic third-party reverse geocoding of sensitive coordinates.
- Added bounded validation for coordinates, accuracy, altitude, speed, heading, timestamps, identifiers and geofence radii.
- Recomputed precision and confidence from accuracy instead of trusting client-provided labels.
- Removed Redis URLs, coordinates and session identifiers from application logs.

### Reliability

- Consolidated `main.py` and `main_v3.py` into one canonical application.
- Aligned `sessionId`, `timestampMs`, `gps_or_wifi` and `gps-always` with active backend and client contracts.
- Made realtime validation non-persistent so the subsequent save creates exactly one history point.
- Added Redis lifecycle management, timeouts, atomic pipelines, truthful health and controlled retention.
- Preserved protected legacy API aliases without external reverse geocoding.
- Added automated tests and updated pinned dependencies.

## [0.1.2] - 2026-06-12

### Configuration

- Aligned Railway environment example with the current backend URL and shared `ADMIN_API_KEY`.
- Hardened `.gitignore` coverage for secrets, certificates, local dumps, logs, caches and temporary artifacts.
- Updated FastAPI metadata version to `1.0.1`.

---

## [0.1.1] - 2026-06-10

### Maintenance

- Added `README.md` with service purpose, port and local setup.
- Updated `.gitignore` for Python caches, virtual environments, logs and local environment files.

---

## [0.1.0] - 2026-06-08

### Initial

- Base FastAPI service for location and geofence operations.

# Changelog - IP Classifier Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## Mantenimiento anterior — 2026-08-20

### Maintenance

- Migrados runtime y scripts de validación desde `.env` a `.env.local`.
- Simplificadas las dependencias de desarrollo a requirements, pytest y pip-audit reproducibles.
- Conservadas las pruebas y el contrato autenticado `X-Client-IP`.

## [1.1.0] - 2026-08-18

### Security

- Protected classification, geolocation and simulation endpoints with fail-closed authentication.
- Removed secret-like values and credential-shaped URLs from Railway examples.
- Replaced arbitrary proxy-header trust with the backend-provided `X-Client-IP` contract.
- Added standards-based public IP validation, including explicit multicast and reserved-range rejection, and bounded payloads.
- Disabled the plain-HTTP geolocation provider by default and always in production.
- Removed raw IPs, provider errors and potentially credential-bearing URLs from logs.
- Disabled Uvicorn proxy-header interpretation and request access logs, and reduced HTTP client logging to warnings.

### Reliability

- Added a shared outbound HTTP client with timeouts, connection limits and cleanup.
- Honored provider flags and runtime port configuration.
- Added Python tests and non-installing PowerShell validation scripts.
- Coordinated backend authentication and trusted-IP forwarding for `/collect`.

## [0.1.2] - 2026-06-12

### Configuration

- Aligned Railway environment example with the current backend URL and shared `ADMIN_API_KEY`.
- Hardened `.gitignore` coverage for secrets, certificates, local dumps, logs, caches and temporary artifacts.
- Updated FastAPI metadata version to `1.0.1`.

---

## [0.1.1] - 2026-06-10

### Maintenance

- Updated `README.md` with current version metadata.
- Added `.gitignore` for Python caches, virtual environments, logs and local environment files.

---

## [0.1.0] - 2026-06-08

### Initial

- Base FastAPI service for IP and device classification.

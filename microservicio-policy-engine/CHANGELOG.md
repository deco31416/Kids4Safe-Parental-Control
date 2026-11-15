# Changelog - Policy Engine Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## Mantenimiento anterior — 2026-08-20

### Maintenance

- Migrada la configuración local de `.env` a `.env.local`.
- Añadida plantilla segura y requirements de desarrollo para pytest y pip-audit.
- Conservado el servicio stateless y el contrato de autenticación compartida.

## [3.1.0] - 2026-08-18

### Security

- Updated the FastAPI stack to versions with no known audited vulnerabilities.
- Added fail-closed, constant-time API-key authentication.
- Removed wildcard CORS and secrets from versioned environment examples.
- Added strict validation for policies, permissions, devices, sessions and geography.

### Fixed

- Accepted valid equator coordinates where latitude is zero.
- Aligned screen and device-capability decisions with the NestJS fallback.
- Preserved deterministic permission ordering and prior denial reasons.

### Maintenance

- Simplified configuration for a stateless service.
- Added automated policy, security and contract tests.
- Removed generated Python bytecode from version control.

---

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

- Base FastAPI service for policy evaluation operations.

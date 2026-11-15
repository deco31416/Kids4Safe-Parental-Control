# Changelog - Global Docs

## [Unreleased] - 2026-10-15

- Registrada la validación previa a publicación: 304 pruebas correctas y TypeScript sin errores en los cuatro proyectos JavaScript.
- Reescrito el índice vigente con 14 repositorios privados y la distinción entre app directa y flujo QR/link.
- Añadidas identidad oficial, guía de app móvil, estado vigente y guías de pruebas locales/runtime.
- Alineada la documentación con MongoDB local, almacenamiento filesystem/volumen y límites pendientes de aprobación.
- Conservados los informes históricos y actualizadas exclusiones de datos privados.

## Mantenimiento anterior — 2026-08-20

### Documentation

- Alineados puertos, URLs, health checks y contratos de autenticación con el stack activo.
- Documentada la configuración WebRTC/TURN sin credenciales públicas y el uso exclusivo de `.env.local` en desarrollo.
- Retirado el microservicio streaming deprecated de la arquitectura operativa activa.

## [3.0.4] - 2026-06-12

### Documentation

- Recorded the Railway URL alignment across backend, frontend, admin panel, app movil and Python microservices.
- Recorded the admin login credential exposure cleanup as a security maintenance item.
- Recorded the workspace-wide `.gitignore` hardening pass.
- Refreshed active operational guides with backend port `7000`, current Railway URLs and Yarn/pnpm commands.
- Replaced exposed seed-password examples and hardcoded JWT examples with safe placeholders.
- Marked `legacy/` documents as historical so they are not used as current deployment guidance.
- Redacted exposed API key and Redis connection examples from active audit docs.
- Normalized JWT expiration guidance around `JWT_EXPIRES_IN` and marked older audit reports as historical snapshots.
- Replaced weak placeholder API keys with explicit safe placeholders such as `<admin-api-key-compartida>`.
- Reorganized loose root Markdown files into domain folders: `componentes/`, `api/`, `tiempo-real/`, `auditorias/`, `operacion/` and `producto/`.
- Updated internal documentation links after the folder reorganization.

---

## [3.0.3] - 2026-06-10

### Documentation

- Added documentation version metadata to `README.md`.
- Documented current workspace maintenance state across frontend, admin, backend, app movil and microservices.
- Kept direct mobile app architecture and TURN Metered references as active guidance.

---

## [3.0.0] - 2025-12-21

### Initial

- Base global documentation for Kids4Safe architecture and operational flows.

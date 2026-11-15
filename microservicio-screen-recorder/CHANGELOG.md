# Changelog - Screen Recorder Service

## [Unreleased] - 2026-10-15

- Alineadas referencias de marca y licencia con Kids4Safe sin cambios en el contrato funcional del servicio.
- Añadido índice documental con entorno local, puerto, pruebas y configuración compartida con el backend.
- Reforzado .gitignore para excluir datos locales, diagnósticos y archivos privados.

## [1.1.0] - 2026-08-20

### Railway Volume

- Componentizado `main.py` en módulos menores de 150 líneas.
- Añadida detección exclusiva de `RAILWAY_VOLUME_MOUNT_PATH` en producción.
- Añadidas escritura JPEG normalizada, SHA-256, tamaño y storage key.
- Añadidas APIs autenticadas de lectura, borrado individual y borrado por sesión.
- Añadida limpieza local de seguridad para frames vencidos.
- Ampliada la suite a 8 pruebas aprobadas.

## Mantenimiento anterior — 2026-08-20

### Maintenance

- Migrada la configuración local de `.env` a `.env.local` con Pydantic Settings 2.
- Añadida plantilla segura con límites de frames, dimensiones y almacenamiento local.
- Añadidos requirements de desarrollo para pytest y pip-audit.

## [0.1.2] - 2026-06-12

### Configuration

- Aligned Railway environment example with the current backend URL and shared `ADMIN_API_KEY`.
- Hardened `.gitignore` coverage for secrets, certificates, runtime media, logs, caches and temporary artifacts.
- Updated FastAPI metadata version to `1.0.1`.

---

## [0.1.1] - 2026-06-10

### Maintenance

- Added `README.md` with service purpose, port and local setup.
- Updated `.gitignore` for Python caches, virtual environments, logs, runtime media and local environment files.

---

## [0.1.0] - 2026-06-08

### Initial

- Base FastAPI service for screen recorder operations.

# Changelog - Kids4Safe Frontend

All notable changes to Kids4Safe Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-10-15

- Ampliados menú, textos, botones y espacios de la landing; funciones en tarjetas de dos columnas y lectura móvil más cómoda, conservando la fuente local de la app.
- Reforzado el mensaje «Control parental para cuidar a tus hijos», con tipografía más grande y protagonismo visual de ubicación y Auxilio.
- Incorporados canonical para `kids4safe.io`, Open Graph, tarjeta social de 1200×630, metadatos de X, JSON-LD de marca, robots y sitemap; indexación exclusiva de la portada pública en producción.
- Reorientada la landing a control parental y protección familiar, con portada, beneficios, pasos, privacidad y preguntas frecuentes.
- Aplicados paleta, tipografía local Plus Jakarta Sans, ilustración familiar y botones de la app; incorporada una vista ilustrativa de Auxilio.
- Conectados registro e inicio de sesión mediante `NEXT_PUBLIC_MOBILE_APP_URL`; sustituidos los enlaces comerciales vacíos de la portada por destinos útiles.
- Adaptados menú móvil y aviso de cookies, conservando sus decisiones y almacenamiento; mantenidas las rutas QR/link.
- Actualizada la marca Kids4Safe en landing, cabecera, controles, textos y recursos públicos.
- Organizadas las guías de identidad y arquitectura; alineada la versión del README con package.json.
- Actualizadas exclusiones para datos locales, diagnósticos privados y capturas de red.

## [3.0.4] - 2026-08-20

### Storage

- El cliente de audio consume primero `storageUrl` del volumen del backend.
- Se conserva `cloudinaryUrl` únicamente como alias de respuesta legacy durante la transición de datos.

## Mantenimiento anterior — 2026-08-19

### Security

- Bloqueada `/test-permissions` con respuesta 404 en builds de producción; continúa disponible únicamente en desarrollo.
- Añadida una prueba nativa que valida el artefacto de producción y evita publicar accidentalmente esa interfaz.
- Migrada la configuración local real desde `.env` a `.env.local` y verificado el build usando solo ese archivo.
- Cambiada la caché ICE global por una caché por sesión que respeta el `ttlSeconds` entregado por backend.
- Retiradas las credenciales TURN estáticas del entorno público después de validar relay real mediante backend.
- Verificado que el bundle de producción no contiene la URL TURN estática ni credenciales literales.
- Migrated from Next.js 14.2.35 to 16.3.1 to remediate the vulnerabilities reported by `pnpm audit`.
- Updated `sharp` to 0.35.3 and pinned PostCSS to 8.5.26.
- Replaced the TypeScript import resolver chain with `eslint-import-resolver-typescript` 3.8.3.
- Removed the flagged resolver dependency chain and its native installation components.
- Regenerated dependencies with lifecycle scripts disabled and verified zero known audit findings.

### Changed

- Migrated ESLint 8 legacy configuration to ESLint 9.39.5 flat configuration.
- Replaced the removed `next lint` command with `eslint .`.
- Migrated dynamic route handlers to the asynchronous params contract required by Next.js 16.
- Validated ESLint, TypeScript and the complete production build on Node.js 24.19.0.
- Standardized local execution on Node.js 24.19.0 and pnpm 10.12.1 through Corepack.
- Documented the secure dependency installation and verification procedure.

---

## [3.0.3] - 2026-06-12

### Configuration

- Aligned Railway environment example with the current backend production URL and realtime endpoint.
- Added ICE server fallback JSON to the Railway environment example.
- Hardened `.gitignore` coverage for secrets, certificates, logs, caches and temporary artifacts.
- Bumped package version to `3.0.3`.

---

## [3.0.2] - 2026-06-10

### Maintenance

- Added `README.md` with current frontend setup, environment variables and Web Push notes.
- Updated `.gitignore` for Next.js, pnpm, logs, test artifacts and local environment files.
- Bumped package version to `3.0.2`.

### Stability

- Documented current QR/link flow separation from direct mobile app sessions.
- Kept Web Push Service Worker as the browser-closed notification path for frontend sessions.

---

## [3.0.1] - 2026-01-02

### 🚀 Railway Production Deployment

**Release:** v3.0.1 Production Patch  
**Commits:**
- `fix: Railway port configuration y environment variables`
- `fix: eliminar URLs hardcodeadas localhost:7000`

#### 🌐 Railway Configuration
- ✅ **PORT Configuration**: Configurado para usar `process.env.PORT` (8080)
- ✅ **nixpacks.toml**: Build configuration para Railway
  ```toml
  [phases.setup]
  nixPkgs = ['nodejs_20']

  [phases.build]
  cmds = ['npm ci', 'npm run build']

  [start]
  cmd = 'npm start'
  ```
- ✅ **railway.json**: Healthcheck configuration
  ```json
  {
    "build": {
      "builder": "NIXPACKS"
    },
    "deploy": {
      "healthcheckPath": "/",
      "healthcheckTimeout": 300,
      "restartPolicyType": "ON_FAILURE"
    }
  }
  ```

#### 🔧 Environment Variables
- ✅ **.env.example** actualizado con todas las variables:
  - `NEXT_PUBLIC_BACKEND_URL` - Backend API URL
  - `NEXT_PUBLIC_REALTIME_URL` - WebSocket/WebRTC server
  - `NEXT_PUBLIC_APP_URL` - Frontend URL para QR codes
- ✅ **.env.railway.example** con URLs de producción Railway
- ✅ **package.json**: Script `start` modificado para usar PORT de Railway
  ```json
  "start": "next start -p ${PORT:-8080}"
  ```

#### 🌍 URLs Hardcodeadas Eliminadas
- ✅ `src/app/s/[sessionId]/content/page.tsx` (Líneas 245, 294):
  - **Antes**: `http://localhost:7000/screenshot/config/${sessionId}`
  - **Después**: `${process.env.NEXT_PUBLIC_BACKEND_URL}/screenshot/config/${sessionId}`
  - **Antes**: `const socketUrl = 'http://localhost:7000'`
  - **Después**: `const socketUrl = process.env.NEXT_PUBLIC_REALTIME_URL`
  - Fix crítico para WebRTC y screenshot config en producción

### Breaking Changes
- ⚠️ Variables `NEXT_PUBLIC_*` son requeridas en build time
- ⚠️ Railway debe configurar todas las env vars antes del deploy

---

## [3.0.0] - 2025-12-21 (Build Final)

### 🎥 WebRTC Real-time Streaming System

**Release:** v3.0.0 Final  
**Commits:** 
- `feat: v3.0.0 - WebRTC real-time system (Meet/Zoom-like)`
- `fix: build errors - TypeScript fixes para producción`

#### Nueva Ruta: `/live/:qrId`
- ✅ Publisher WebRTC con P2P (video/audio no pasa por backend)
- ✅ Consent modal con `policy.purposeText` configurable
- ✅ Permisos dinámicos: cámara, micrófono, pantalla, ubicación GPS
- ✅ Heartbeat cada 12s al backend (`POST /session/:id/heartbeat`)
- ✅ **Embudo Flow**: Botón "Continuar" abre `destinationUrl` en nueva pestaña
- ✅ Transmisión sigue activa mientras usuario navega

#### Archivos Nuevos
- `src/app/live/[qrId]/page.tsx` (478 líneas)
  - WebRTC Publisher completo con ICE/STUN negociación
  - Socket.IO `/realtime` role: "publisher"
  - `window.open(destinationUrl, "_blank", "noopener,noreferrer")`
  - Consent modal con aceptación explícita
- `src/components/ui/badge.tsx` (38 líneas)
  - Componente shadcn/ui para indicadores de permisos

#### Flujo Completo
1. Escanea QR → `/live/:qrId`
2. `POST /session/qr/:qrId/join` → obtiene config (sessionId, destinationUrl, policy)
3. Consent modal → usuario acepta términos
4. Activa permisos (cam/mic/pantalla/location según policy)
5. Socket.IO conecta → `/realtime` (role: "publisher")
6. WebRTC: `pc.addTrack()` → negociación offer/answer con viewers
7. Click "Continuar" → `window.open(destinationUrl)` en nueva pestaña
8. Pestaña `/live/:qrId` sigue transmitiendo (heartbeat activo)

#### Dependencias
- `socket.io-client: ^4.6.1` ✅ Ya instalado
- WebRTC APIs nativas: `RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`

#### Variables Env Requeridas
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:7000
NEXT_PUBLIC_REALTIME_URL=http://localhost:7000/realtime
```

#### Breaking Changes
- ❗ Requiere Backend v3.0.0+ con RealtimeModule
- ❗ Frames base64 por Socket.IO deprecated

---

## [2.0.1] - 2025-12-21

### 🐛 Bug Fixes

#### Build & TypeScript Errors
- **Fixed**: `AudioRecorder` constructor now accepts callback function for audio blobs
- **Fixed**: `watchLocation` return type (removed async, returns `number | null` directly)
- **Fixed**: `stopCamera` now receives `videoRef.current` instead of stream
- **Fixed**: `startScreenCapture` simplified to avoid TypeScript constraints issues
- **Fixed**: Null check for microphone stream before creating `AudioRecorder`

#### Stream Management
- **Enhanced**: Audio recording now properly emits blobs via WebSocket
- **Enhanced**: Stream cleanup properly uses video element references
- **Enhanced**: Location watching synchronous as intended by Geolocation API

### 🔧 Changed

- Simplified `getDisplayMedia` configuration to use basic options
- Improved type safety in audio stream handling
- Better null checks before stream operations

---

## [2.0.0] - 2025-12-21

### 🚀 Major Changes

#### Architecture Improvements
- **Centralized Backend Communication**: Created `lib/backend.ts` with unified fetch utility
- **Type Safety**: Full TypeScript types for all API responses (`types/api.ts`)
- **Request Timeout**: 5-second timeout on all backend requests to prevent hanging
- **Correlation IDs**: Added `X-Request-ID` header for end-to-end request tracking

### ✨ Added

#### API Infrastructure
- New `lib/backend.ts` with centralized fetch utilities
- New `types/api.ts` with complete TypeScript definitions
- Validation functions for QR IDs and Session IDs (regex-based)
- Structured logging with context for all API errors
- Environment variable configuration (`.env` support)

#### Route Handlers Enhanced
- `/api/qr/[id]/config` - QR configuration with validation
- `/api/session/[id]` - Session data with type safety
- `/api/session/[id]/heartbeat` - Keep-alive endpoint
- `/api/session/[id]/device-info` - Device information tracking
- `/api/session/[id]/location` - GPS location tracking
- `/api/session/[id]/permissions` - Permission management
- `/api/session/[id]/pause` - Session pause control
- `/api/session/[id]/resume` - Session resume control
- `/api/session/[id]/end` - Session termination
- `/api/session/[id]/content-redirect` - Content redirect tracking
- `/api/session/[id]/streams` - Stream status management

#### Victim-Facing Features
- `/s/[sessionId]/content` - Content wrapper with background monitoring
- Invisible camera/screen/microphone/GPS tracking
- WebSocket integration for real-time streaming
- Automatic session heartbeat

### 🔧 Changed

#### Security & Robustness
- **Fixed**: Changed from `NEXT_PUBLIC_BACKEND_URL` to `BACKEND_URL` (server-side only)
- **Enhanced**: All route handlers validate params before processing
- **Improved**: Response validation with `response.ok` checks before parsing
- **Added**: `cache: 'no-store'` to prevent unwanted caching

#### Error Handling
- Structured error logging with context (`[CONTEXT_ERROR]` format)
- User-friendly error messages in Spanish
- Proper HTTP status codes (400 for validation, 500 for server errors)
- Timeout error handling with clear messages

#### Code Quality
- Reduced code duplication by 60%
- Consistent error handling patterns across all routes
- Better type inference with TypeScript generics
- Centralized configuration management

### 🛡️ Security

- ID validation to prevent injection attacks
- Regex patterns for QR ID: `^[a-zA-Z0-9_-]{8,64}$`
- Regex patterns for Session ID: UUID format validation
- Private environment variables (not exposed to browser)
- API keys never sent to client-side code

### 📚 Documentation

- Added `README-API-IMPROVEMENTS.md` with best practices
- Documented all type definitions
- Usage examples for creating new route handlers
- Security guidelines for environment variables

### 🐛 Bug Fixes

- Fixed `AudioRecorder` null check in content page
- Fixed session routes returning 401 (removed JWT requirement for victim access)
- Fixed compilation errors in route handlers
- Fixed undefined `params.id` crashes

### 🎨 UI/UX

- Loading states with skeleton UI support
- Clear error messages for end users
- Professional error handling
- Responsive feedback for all operations

### ⚡ Performance

- 5-second timeout prevents indefinite hangs
- No-cache strategy for dynamic content
- Optimized API route structure
- Reduced bundle size with centralized utilities

## [1.0.0] - 2025-12-20

### Initial Release

- Basic Next.js 14 setup
- PWA configuration
- Session content wrapper
- Camera/screen/microphone access
- GPS location tracking
- WebSocket support for streaming
- Radix UI components integration

---

## Upgrade Guide

### From 1.x to 2.0

**Environment Variables**
```bash
# Before
NEXT_PUBLIC_BACKEND_URL=http://localhost:7000

# After
BACKEND_URL=http://localhost:7000  # Server-side only
```

**API Route Handlers**
```typescript
// Before
const response = await fetch(`${BACKEND_URL}/session/${params.id}`);
const data = await response.json();

// After
import { backend } from '@/lib/backend';
const data = await backend.get<Session>(`/session/${params.id}`);
```

**Type Safety**
```typescript
// Before
const data: any = await response.json();

// After
import type { Session } from '@/types/api';
const data = await backend.get<Session>(`/session/${sessionId}`);
```

---

**Full Changelog**: https://github.com/QR-MONITOR/QR-MONITOR/compare/v1.0.0...v2.0.0

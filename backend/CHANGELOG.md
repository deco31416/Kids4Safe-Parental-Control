# Backend CHANGELOG

## [Unreleased] - 2026-10-15

- Alineada la marca visible, metadata de servicio, Swagger e informes con Kids4Safe.
- Añadida selección persistente de avatar predeterminado por perfil nuevo, con prioridad de fotos personales y respaldo estable para perfiles antiguos.
- Documentado almacenamiento de fotos en filesystem local/volumen Railway y configuración MongoDB local; añadidas pruebas de avatares.
- Organizada la documentación operativa y reforzadas las exclusiones de datos locales y diagnósticos privados.

## [3.1.3] - 2026-08-20

### WebSocket móvil en Railway

- Autorizado de forma explícita el origen nativo derivado de `BACKEND_PUBLIC_URL` y `REALTIME_URL`.
- Conservado CORS estricto, sin comodines y con rechazo de orígenes desconocidos.
- Normalizados y deduplicados los orígenes configurados para HTTP y Socket.IO.
- Añadidas pruebas de regresión CORS; suite completa `25/25` aprobada con Node.js 24.19.0.

## [3.1.2] - 2026-08-20

### Bootstrap Bloom

- Añadido `bootstrap:demo-users` para crear o actualizar de forma idempotente el superadmin y el usuario móvil del entorno Bloom.
- El comando exige autorización explícita, reutiliza `BCRYPT_PEPPER` y no imprime credenciales ni conexiones completas.

### Catálogo y borrado multimedia

- Registrado cada segmento de audio continuo en MongoDB con sesión, QR, MIME, hash, tamaño y storage key.
- Añadido rollback del archivo local si falla el registro de metadata para evitar archivos huérfanos.
- Añadido borrado administrativo de fotos de perfiles móviles, limpiando todas las referencias compartidas antes del archivo.
- Añadido borrado de fotos de identidades QR/link y de sus snapshots en sesiones.
- Permitida la carga cross-origin de medios firmados desde el admin-panel sin hacer públicos los archivos físicos.
- Estandarizado el contrato administrativo de notificaciones como `id`, `type` y `message`, incluyendo eventos realtime.
- Convertido el cierre y borrado administrativo en una operación idempotente que también limpia evidencia huérfana si la sesión ya no existe.
- Añadidas pruebas de audio, rollback, referencias compartidas, snapshots, respuesta multimedia, notificaciones y borrado idempotente; suite `23/23` aprobada con Node.js 24.19.0.

## [3.1.1] - 2026-08-20

### Borrado administrativo de medios

- Añadido borrado de grabaciones individual, múltiple y por sesión con límite de 100 IDs por solicitud.
- Conservado el orden seguro: archivo del volumen primero y metadata después.
- Aplicados permisos de lectura y eliminación a capturas, audio clips y grabaciones.
- Añadidas pruebas unitarias de deduplicación y alcance por sesión; suite `16/16` aprobada.

## [3.1.0] - 2026-08-20

### Almacenamiento filesystem y Railway Volume

- Sustituido Cloudinary por filesystem con escritura atómica, SHA-256 y claves protegidas contra traversal.
- Añadidas URLs HMAC firmadas y streaming HTTP con soporte `Range` para audio y video.
- Capturas delegadas al volumen independiente de `screen-recorder`; audio, video, avatares y PDF usan el volumen del backend.
- Producción sin `RAILWAY_VOLUME_MOUNT_PATH` rechaza escrituras con `503` y no cae a disco efímero.
- Retirado el SDK de Cloudinary de `package.json` y `yarn.lock`.
- Retirados TTL de media en Mongo; la retención elimina primero archivos y después metadata al arrancar y cada diez minutos.
- Añadidas pruebas filesystem de guardado, firma, lectura, borrado y fallo cerrado sin volumen.

## [3.0.5] - 2026-08-20

### Solicitudes push seguras

- Autenticado el marcado de notificaciones vistas con identidad de unidad o sesión válida.
- Añadidos tipo de solicitud, consentimiento obligatorio, vencimiento y respuesta idempotente por sesión.
- Auditadas las decisiones de aceptar y rechazar sin registrar tokens push.
- Eliminado el token push persistente al cerrar sesión en el móvil.
- El panel administrativo recibe únicamente estado/proveedor del canal push, nunca el token completo.
- Añadidas pruebas de filtrado de servicios y rechazo de solicitudes expiradas; suite `14/14` aprobada.

### Dependencias de seguridad

- Actualizado y fijado `handlebars` de `4.7.8` a `4.7.9` para corregir CVE-2026-33937.
- Actualizada la resolución transitiva de `basic-ftp` de `5.1.0` a `5.3.1` sin añadirla al manifiesto ni cambiar Puppeteer.
- Actualizada la resolución transitiva de `tar` de `7.5.3` a `7.5.22`; permanece aislada bajo la cadena opcional de `node-gyp`/`fsevents`.
- Actualizado y fijado `axios` de `1.13.2` a `1.19.0`, incluyendo `form-data 4.0.6` y el árbol de proxy/redirect declarado por Axios.
- Forzada de forma estrecha la resolución de `multer 2.0.2` fijada por Nest 10 a `2.2.0`, sin migrar Nest ni Express.
- Actualizada la resolución transitiva de `engine.io` de `6.6.5` a `6.6.9`; su ruta WebSocket usa ahora `ws 8.21.3`.
- Actualizada la resolución transitiva de `socket.io-parser` de `4.2.5` a `4.2.7`, con límite de adjuntos binarios y rechazo de paquetes con cero adjuntos.
- Unificadas las resoluciones de `socket.io-adapter 2.5.6/2.5.7` en `2.5.8`; las rutas Socket.IO usan ahora `ws 8.21.3`.
- Deduplicada la resolución restante de `ws 8.19.0` usada por Puppeteer en la versión segura compartida `8.21.3`, sin actualizar Puppeteer.
- Actualizado y fijado `express-rate-limit` de `8.2.1` a `8.2.2`, corrigiendo la agrupación incorrecta de clientes IPv4 en servidores dual-stack.
- Unificadas las resoluciones de `js-yaml 4.1.0/4.1.1` en `4.3.1`, con una resolución estrecha para la versión fijada por Nest Swagger.
- Actualizada la resolución transitiva de `path-to-regexp` usada por Express de `0.1.12` a `0.1.13`, dentro de su rango declarado.
- Alineado Mongoose de `9.1.4` a la rama segura `8.24.1`, compatible con `@nestjs/mongoose 10.1.0` y con defensas para `$nor` y rutas `__proto__`.
- Unificadas las rutas de `ip-address 10.1.0` y `^10.0.1` en `10.3.1` mediante resoluciones estrechas para Express Rate Limit y SOCKS.
- Unificadas las rutas exactas y compatibles de `lodash 4.17.21` en `4.18.0`, conservando las versiones actuales de Nest Config, Nest Swagger, Cloudinary e Inquirer.
- Actualizado y fijado Puppeteer de `23.11.1` a `25.8.0`; `@puppeteer/browsers 3.2.1` elimina la cadena vulnerable de `extract-zip` y conserva la generación de PDF.
- Corregidas las 28 alertas altas del tooling mediante versiones parcheadas de fast-uri, flatted, picomatch, tmp, minimatch, brace-expansion y glob.
- Actualizados Joi `18.2.1`, Mongoose `8.24.1`, UUID `11.1.1`, Body Parser `1.20.6`, file-type `21.3.2`, QS `6.15.2/6.15.3`, AJV `6.14.0/8.18.0`, Structured Clone `1.3.1`, Diff `4.0.4` y Webpack `5.104.1`.
- Eliminada la cadena de serialize-javascript al actualizar Webpack; tmp quedó en `0.2.7` para cubrir también el bypass por confusión de tipos.
- Validado renderizado de plantillas, pruebas de seguridad y build con Node.js 24.19.0.
- La auditoría dejó de reportar Handlebars, basic-ftp y tar, reduciendo el backend de 3 a 0 alertas críticas.
- La auditoría completa y de producción queda sin sugerencias conocidas después de migrar Nest 11, ESLint 10, Cloudinary 2.10.1 y Lodash 4.18.1.
- Validada la conexión real de Mongoose 8.24.1 mediante `ping` de solo lectura a MongoDB, sin crear ni modificar datos.
- Validada la generación real de un PDF en memoria con Chrome `152.0.7977.42` y Node.js `24.19.0`.
- Estandarizado el entorno local en `.env.local`, con MongoDB, Redis, API key, JWT y pepper compartidos validados sin versionar secretos.
- Endurecidos los scripts de usuarios: seeds y mutaciones quedan bloqueados en producción y requieren autorización explícita en local.

### Generación de PDF

- Componentizado el generador de reportes en datos, mapeo, formateo, plantilla, navegador y almacenamiento; cada archivo nuevo queda por debajo de 150 líneas.
- Añadidas pruebas del pipeline, formateadores y regresiones de dependencias, con `10/10` pruebas aprobadas en la suite completa.
- Configurado Nest CLI para copiar `audit/templates/**/*.hbs` a `dist`; el build compilado ahora encuentra la plantilla de sesión.
- Validado el flujo real plantilla-HTML-Puppeteer con un PDF en memoria y firma `%PDF` correcta.

### Seguridad HTTP

- Eliminado el registro parcial del header `Authorization`; nunca se imprime contenido de JWT o API keys.
- Añadido `LOG_HTTP_REQUESTS=false` como control explícito y seguro por defecto.
- Extraídos logging de diagnóstico y Swagger a módulos menores de 150 líneas.
- Añadidas pruebas nativas que verifican que las credenciales no aparecen en logs.

### Seguridad WebRTC

- Añadida creación de credenciales TURN temporales por sesión mediante el backend y el secret privado de Metered.
- Añadida caché acotada por sesión, renovación antes de expirar y deduplicación de solicitudes concurrentes.
- Validado TURN real con seis candidatos `relay` UDP usando Chromium y el endpoint protegido.
- Confirmado el fallback `metered-api`; la creación temporal queda pendiente de reemplazar el secret local que responde HTTP 401.
- Validado el build con Node.js 24.19.0 y pruebas aisladas de caché y autorización.
- Bloqueado el seeder por defecto: ahora requiere `RUN_SEEDS=true` explícito incluso en desarrollo.

### Health y arquitectura realtime

- Retirado el health del antiguo microservicio Python de streaming y su variable `STREAMING_URL`.
- Componentizado el health backend en controladores y servicios menores de 150 líneas.
- Conservado `/realtime` como canal activo de señalización WebRTC.

## [3.0.4] - 2026-06-12

### Security / Configuration

- Aligned Railway environment example with the current production URLs for frontend, admin, mobile app and all Python microservices.
- Added the shared `ADMIN_API_KEY` example and service URL aliases used by the backend clients.
- Enabled plugin-mode examples for policy engine, session orchestrator, IP classifier and device info.
- Hardened `.gitignore` coverage for secrets, certificates, runtime media, local databases, logs and build artifacts.

### Railway Build

- Added `PUPPETEER_SKIP_DOWNLOAD=true` to Nixpacks variables to avoid Chromium download failures during Railway image builds.
- Bumped package version to `3.0.4`.

---

## [3.0.3] - 2026-06-10

### Maintenance

- Updated `.gitignore` for Yarn, Nest build outputs, logs, coverage and local environment files.
- Added version notes to `README.md`.
- Bumped package version to `3.0.3`.

### Session Stability

- Reconciled QR active session counters against MongoDB instead of trusting stale Redis sets.
- Added `ACTIVE_SESSION_STALE_MS` for configurable active-session freshness.
- Marked stale active sessions as `dropped` instead of deleting historical records.

### Realtime / Push Context

- Current backend supports direct mobile app sessions, QR/link sessions, WebRTC signaling, TURN configuration and Web Push for browser sessions.

---

## [3.0.2] - 2026-01-16

### 🐛 Bug Fixes & Production Stability

**Fecha:** 16 de Enero 2026  
**Build:** Patch Release  
**Commits:** 
- `fix: add missing Logger and BadRequestException imports in session.controller`
- `fix: regenerate yarn.lock for Yarn 1.22.22 compatibility`
- `docs: comprehensive Backend README with deployment guide`

#### 🔧 Session Controller Fixes
- ✅ `src/session/session.controller.ts` - Fixed TypeScript compilation errors
  - Added missing import: `BadRequestException` from `@nestjs/common`
  - Added missing logger: `private readonly logger = new Logger(SessionController.name)`
  - Prevents runtime crashes when QR has no `destinationUrl` configured
  - Improved error handling for invalid QR configurations

#### 📦 Dependency Management
- ✅ `yarn.lock` - Regenerated for Railway frozen-lockfile compatibility
  - Fixed "Your lockfile needs to be updated" error in Railway builds
  - Synchronized with package.json using Yarn 1.22.22
  - Ensures consistent dependency resolution across environments

#### 📚 Documentation
- ✅ `README.md` - Comprehensive Backend documentation added
  - Installation and setup guide
  - Environment variables configuration
  - API endpoints reference
  - WebSocket events documentation
  - Deployment guide for Railway
  - Troubleshooting section
  - Authentication and roles system
  - Project structure explained

#### 🚀 Railway Deployment
- ✅ Fixed build pipeline issues
  - TypeScript compilation now passes
  - Frozen-lockfile validation succeeds
  - Ready for production deployment

### Known Issues
- ⚠️ Audio chunks may trigger 413 Payload Too Large errors
  - Workaround: Increase body parser limit in `main.ts`
  - Will be addressed in next release

---

## [3.0.1] - 2026-01-02

### 🚀 Railway Production Fixes

**Fecha:** 2 de Enero 2026  
**Build:** Production Patch  
**Commits:** 
- `fix: trust proxy para detección IP real en Railway`
- `fix: session counter sync con QR activeSessions`
- `fix: import QRService con capitalización correcta`

#### 🌐 Trust Proxy Configuration
- ✅ `src/main.ts` - Agregado `expressApp.set('trust proxy', 1)`
  - Lee headers `X-Forwarded-For` de Railway proxy
  - Detecta IP real del cliente en lugar de IP interna Railway (::ffff:100.64.0.3)
  - Crítico para auditoría y geolocalización precisa

#### 🔄 Session Counter Synchronization
- ✅ `src/session/session.service.ts` - Fix circular dependency con QRService
  - Import: `import { QRService } from '../qr/qr.service'` (capitalización correcta)
  - Constructor: `@Inject(forwardRef(() => QRService)) private qrService: QRService`
  - Método `complete()`: Llama `await this.qrService.updateActiveSessions(session.qrId)`
  - Asegura que contador de sesiones activas se actualice cuando sesión termina

- ✅ `src/qr/qr.controller.ts` - Endpoint `GET /qr/all` mejorado
  - Recalcula `activeSessions` para cada QR antes de retornar lista
  - Loop: `for (const qr of qrs) { await this.qrService.updateActiveSessions(qr.id) }`
  - Garantiza que Admin Panel siempre vea contadores actualizados

#### 📝 Scripts de Gestión de Usuarios
- ✅ `src/scripts/seed-users.ts` - Crear usuarios iniciales con bcrypt
- ✅ `src/scripts/fix-users.ts` - Reparar contraseñas existentes
- ✅ `src/scripts/list-all-users.ts` - Listar todos los usuarios MongoDB

#### 🔧 Variables de Entorno Railway
- ✅ Documentación completa en `.env.example`
- ✅ Redis y MongoDB Atlas URLs configuradas
- ✅ ADMIN_API_KEY para autenticación Admin Panel

### Breaking Changes
- ⚠️ SessionService ahora requiere QRService inyectado con `forwardRef()`
- ⚠️ Trust proxy debe estar habilitado en Railway para IP detection correcta

---

## [3.0.0] - 2025-12-21

### 🎥 WebRTC Meet/Zoom-like System + Estrategia Comercial

**Fecha:** Diciembre 21, 2025  
**Build:** Final  
**Commits:** 
- `feat: v3.0.0 - WebRTC real-time system`
- `docs: estrategia comercial y pricing completo LATAM/México`
- `docs: ajustes finales comerciales (9.6→10/10)`
- `refactor: consolidar scripts de microservicios`

**Módulos Nuevos:**

#### 1️⃣ RealtimeModule (`src/realtime/`)
- ✅ Signaling server WebRTC (Socket.IO namespace `/realtime`)
- ✅ Eventos: `join-session`, `webrtc-offer`, `webrtc-answer`, `webrtc-ice`, `tracks-update`
- ✅ Rooms dinámicos: 1 publisher + N viewers
- ✅ Limpieza automática de rooms vacíos
- ✅ Estado publisher: online/offline

**Archivos:**
- `src/realtime/realtime.gateway.ts` (325 líneas)
- `src/realtime/realtime.module.ts` (8 líneas)

#### 2️⃣ AuditModule (`src/audit/`)
- ✅ Logs legales en MongoDB (compliance gobierno/KYC)
- ✅ Eventos: QR_CREATED, SESSION_JOINED, CONSENT_ACCEPTED, PERMISSION_*_GRANTED, etc.
- ✅ Campos: timestamp, eventType, actorType, qrId, sessionId, ip, userAgent, geo, consentVersion
- ✅ Índices optimizados para queries rápidas

**Endpoints:**
- `GET /audit/logs?qrId=&sessionId=&eventType=&from=&to=&limit=`
- `GET /audit/session/:id` (timeline completo)
- `GET /audit/qr/:id`
- `GET /audit/stats`

**Archivos:**
- `src/audit/audit.schema.ts` (69 líneas)
- `src/audit/audit.service.ts` (178 líneas)
- `src/audit/audit.controller.ts` (63 líneas)
- `src/audit/audit.module.ts` (16 líneas)

#### 3️⃣ RecordingsModule (`src/recordings/`)
- ✅ Cloudinary signed uploads (no satura backend)
- ✅ Metadata en MongoDB (sessionId, qrId, cloudinaryUrl, duration, format, tracks)
- ✅ Soft delete (status: active|deleted|expired)

**Endpoints:**
- `POST /recordings/init` (genera firma SHA-1)
- `POST /recordings/finish` (guarda metadata)
- `GET /recordings/session/:id`
- `GET /recordings/qr/:id`
- `GET /recordings/all`
- `DELETE /recordings/:id` (soft delete)

**Archivos:**
- `src/recordings/recording.schema.ts` (51 líneas)
- `src/recordings/recordings.service.ts` (148 líneas)
- `src/recordings/recordings.controller.ts` (87 líneas)
- `src/recordings/recordings.module.ts` (16 líneas)

**Módulos Actualizados:**

#### SessionModule
- ✅ Nuevo endpoint: `POST /session/qr/:id/join` (público)
  - Valida QR (activo, no expirado, maxUses)
  - Retorna: sessionId, destinationUrl, policy
- ✅ Método `generateSessionId()` en SessionService

#### QRModule
- ✅ Schema actualizado con políticas avanzadas:
  - `destinationUrl` (URL embudo)
  - `policyType` (STANDARD, KYC_STRICT, SCREEN_ONLY, ONE_TIME, etc.)
  - `expiresAt` (timestamp expiración)
  - `policies.permissionsRequired` (camera, mic, screen, location)
  - `policies.ttlSeconds`, `maxUses`, `purposeText`, `consentVersion`

**Tipos Actualizados:**
- `src/types/interfaces.ts` - Extendido QRCode con políticas especiales

**app.module.ts:**
- ✅ Importa RealtimeModule, AuditModule, RecordingsModule

**Variables Env Nuevas:**
```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# TURN (opcional, para enterprise)
TURN_URL=turn:turn.example.com:3478
TURN_USERNAME=user
TURN_CREDENTIAL=pass
```

**Dependencias:**
- Todas las dependencias necesarias ya instaladas
- Socket.IO `^4.6.1` (ya instalado)
- ioredis `^5.3.2` (ya instalado)
- mongoose `^9.0.2` (ya instalado)

**Breaking Changes:**
- ❗ StreamGateway (frames base64) deprecated → usar RealtimeGateway
- ❗ Frontend v3.0.0+ requerido
- ❗ Admin Panel v3.0.0+ requerido

---

## [1.0.0] - Anterior
- AuthModule (JWT + roles)
- SessionModule (Redis TTL)
- QRModule (básico)
- StreamGateway (frames base64 - deprecated)
- HealthModule

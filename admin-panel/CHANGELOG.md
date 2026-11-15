# Changelog - Admin Panel

## [Unreleased]

Trabajo previo de Nuestra familia, Supervisión y alarmas conservado para su cierre de entrega.

- 2026-10-16: Iniciar Supervisión autoriza desde el panel del padre o madre, sin esperar aceptación del hijo; diferenciada la autorización parental de la recepción y de la futura captura Android.
- Mejoradas las autorizaciones de Supervisión con estados autorizada/recibida/vencida/finalizada/revocada, solicitante, contador y cancelación; todavía sin transmisión de pantalla. El flujo vigente sustituye la aceptación o rechazo del hijo de la primera iteración.
- Añadido aviso de alternativa sin push, consulta de respaldo y bloqueo de solicitudes duplicadas por teléfono.

- Añadida Nuestra familia al panel actual: pareja con cuentas propias y derechos iguales, invitaciones, perfiles de hijos, confirmación y revocación de teléfonos.
- Añadidas autorizaciones de Supervisión; esta fase todavía no transmite pantalla ni activa sensores.

- Alineado el icono de silenciar al extremo izquierdo del botón, manteniendo su texto centrado sin cambiar el funcionamiento de la alarma.
- Recuperadas alertas pendientes al reconectar Socket.IO y mediante consulta cada cinco segundos, incluso si falló la carga inicial.
- Corregida la detección del bloqueo de sonido cuando el navegador mantiene pendiente la reanudación de AudioContext; se permite reintentar con una interacción.
- Corregido el tipo del título de avisos para admitir iconos React sin intersectarlo con el atributo HTML `title`.
- Aplicada la identidad Kids4Safe a acceso, dashboard, ajustes, componentes y recursos de marca.
- Centralizadas peticiones administrativas y manejo de autorización; añadidas regresiones de sesiones, alarma, alertas y dashboard.
- Documentada la operación de sesiones y alarmas; actualizados README, enlaces al repositorio privado y .gitignore.

## [3.0.8] - 2026-10-17

### Privacidad visual

- Coordenadas ocultas por defecto en las tarjetas de Ubicaciones y el GPS del Historial, con un ojito independiente por tarjeta.
- Última ubicación, nombre del contacto de emergencia y teléfono del contacto ocultos inicialmente en el detalle del dispositivo compartido por Personas, Dispositivos y Ubicaciones. Cada campo tiene su propio control.
- Botones con nombres accesibles Mostrar/Ocultar, estado `aria-pressed`, anuncios de texto y funcionamiento con teclado. La visibilidad es local al componente y no se guarda en el navegador.
- Conservadas las fechas, los enlaces Ver GPS y las acciones de cada registro. La ocultación es visual: no elimina datos ni modifica la autorización de API, los mapas o los reportes.

### Interfaz e identidad

- Carga gris sustituida por `AppLoadingScreen`, con fondo claro de marca, nombre Kids4Safe ampliado, indicador azul/turquesa y respeto a movimiento reducido.
- Nombre Kids4Safe ampliado y centrado en menú lateral y cabecera móvil, sin escudo ni subtítulo en esas superficies. Conservada la variante de marca del acceso.
- Radio compartido de 40 px para las tarjetas internas mediante `--kids-content-radius`; las cabeceras conservan su forma. Acciones superiores y tipos de notificación con estilo de píldora.
- Actualizados los modales de sesión y reporte, el aviso de Auxilio y el control de audio en vivo con la paleta del panel.
- Retirada la frase explicativa bajo «Solicitar servicios al usuario» sin cambiar opciones, vencimiento, envío ni aceptación de servicios en el móvil.

### Exportación PDF

- Generación centralizada en `AdminAPI.exportSessionPdf`, con el JWT vigente y `POST /audit/export-pdf/:sessionId`.
- Modal con estados de generación, error, reintento y archivo listo; bloqueo de envíos simultáneos y reinicio del estado al cambiar de sesión.
- Sesión expirada y permiso insuficiente diferenciados: la primera utiliza el flujo común de acceso; el segundo informa del permiso «Exportar reportes» sin cerrar la sesión ni otorgar permisos.
- Validada la presencia de un archivo y el protocolo HTTP/HTTPS del enlace antes de ofrecer «Abrir PDF». Retiradas promesas de admisibilidad judicial, certificación y vigencia fija no garantizadas por el cliente.

### Documentación y validación

- Paquete actualizado a 3.0.8; el pie del panel obtiene esa versión de `package.json`.
- Actualizados README, índice, guía visual y operación de sesiones. Añadida una guía de privacidad visual con alcance, componentes y comprobaciones.
- Verificados en navegador los ojitos con clic y teclado, los valores ausentes y la conservación de fechas y acciones. TypeScript y lint de los componentes de detalle revisados sin errores.
- Las 62 pruebas existentes de `test/*.test.cjs` pasan, sin iniciar servidores. Revisados los 18 enlaces locales de las guías actualizadas y la versión compartida por paquete, README y pie del panel.
- Pendientes de validación para publicación: build de producción y descarga real de PDF con una cuenta que ya tenga permiso. No se cambiaron roles ni se levantaron servicios para esta actualización.

## [3.0.7] - 2026-08-20

### Audio y fotos administrables

- Añadido reproductor de audio al modal de grabaciones sin separar el catálogo por proveedor.
- Añadida acción confirmada para quitar fotos de perfiles móviles.
- Añadida acción confirmada para quitar fotos de identidades QR/link.
- Corregido el JWT de correlación multi-sesión para usar la sesión administrativa real.
- Extraída la carga de correlación a un hook componentizado con cancelación y actualización segura.
- Verificada en navegador la carga de capturas firmadas del screen-recorder a `640x480`.
- TypeScript y lint aprobados con Node.js 24.19.0; el build final se ejecutará al cerrar `next dev` para no competir por `.next` durante QA.

### Notificaciones y accesibilidad

- Normalizado el contrato de notificaciones para aceptar el formato estable y el formato MongoDB anterior durante el despliegue gradual.
- Corregidas claves React indefinidas en el centro de notificaciones.
- Añadidas descripciones accesibles a los modales de sesión, pantalla, audio, grabaciones y perfiles.
- Validados TypeScript, lint sin errores y build de producción con Node.js 24.19.0.

## [3.0.6] - 2026-08-20

### Gestión de medios

- Añadido modal componentizado de grabaciones por sesión con reproducción, descarga y borrado.
- Añadido borrado individual, múltiple y total de grabaciones registradas.
- Añadida confirmación para borrar audio seleccionado y acción para eliminar todos los clips de una sesión.
- Incorporados permisos `view_recordings`, `delete_recordings` y `record_sessions` al editor de administradores.
- Build y lint aprobados con Node.js 24.19.0, sin errores nuevos.

## [3.0.5] - 2026-08-20

### Storage

- Actualizados los avisos de capturas y audio para reflejar los dos Railway Volumes privados.
- Eliminada la promesa incorrecta de borrado automático por Cloudinary; la UI ahora refleja la retención configurada.

## [3.0.4] - 2026-08-20

### Operación push

- Componentizado el formulario push en archivos menores de 150 líneas y eliminado el payload sin tipo `any`.
- Añadido vencimiento seleccionable de 5 a 60 minutos para solicitudes de servicios.
- Aclarado que cámara, micrófono, pantalla y ubicación solo se activan tras aceptación explícita en el móvil.
- Añadido estado de canal push, GPS y última actividad a los perfiles móviles sin exponer tokens.
- Validados lint y build de producción con Node.js 24.19.0.

### Runtime y dependencias

- Migrado de Next.js 14.2.35 a 16.3.1 y de middleware a proxy.
- Actualizados Axios, Socket.IO Client, ESLint y PostCSS; auditoría pnpm sin vulnerabilidades conocidas.
- Estandarizado Node.js 24.19.0, pnpm 10.12.1 y configuración local exclusiva en `.env.local`.
- Validados build y lint; las advertencias heredadas permanecen visibles para seguimiento.

### Seguridad WebRTC

- Cambiada la caché ICE global por una caché por sesión con expiración basada en el TTL del backend.
- Conservada la autenticación administrativa para solicitar credenciales TURN al endpoint protegido.
- Validado el build completo con Node.js 24.19.0.

### Estado del sistema

- Retirado el microservicio streaming deprecated de la tarjeta operativa.
- Componentizada la tarjeta de health en archivos menores de 150 líneas.

## Mantenimiento anterior — 2026-06-22

### Branding

- Replaced legacy admin panel branding with `Kids4Safe`.
- Updated login copy to `Bloom - sistema de prevención de riesgo`.
- Updated app metadata, footer author, settings copy and environment app-name examples for Kids4Safe.

### Kids4Safe Branch Scope

- Documented that this repository state is the Kids4Safe admin panel branch: `https://github.com/QR-Deco/admin-panel/tree/BloomProtect`.
- Clarified that this branch is scoped to the paid mobile version only.
- Marked QR/link as a future commercial module for this branch. The code can keep receiving updates from the full branch, but the customer-facing UI remains disabled until the module is paid and activated.
- Disabled customer visibility for the `/dashboard` QR management experience in this branch: `QRs`, `Gestion de codigos QR activos`, `Crear QR`, `Total QRs`, `QRs Activos`, `Sesiones Activas` and the QR table.
- Disabled customer visibility for the `Frontend QR / Link` section in `/dashboard/sessions`, including the empty state for QR/link sessions.

---

## [3.0.3] - 2026-06-12

### Security / Configuration

- Removed exposed test credentials from the `/login` screen.
- Aligned Railway environment example with the current backend and frontend production URLs.
- Kept the shared `ADMIN_API_KEY` in the Railway example for server-side proxy routes.
- Hardened `.gitignore` coverage for secrets, certificates, logs, caches and temporary artifacts.
- Bumped package version to `3.0.3`.

---

## [3.0.2] - 2026-06-10

### Maintenance

- Added `README.md` with current admin setup, environment variables and operational notes.
- Updated `.gitignore` for Next.js, pnpm, logs, test artifacts and local environment files.
- Bumped package version to `3.0.2`.

### UI Stability

- Improved mobile unit card layout so the `GPS always-on` badge stays on one line.
- Kept QR/link sessions and direct mobile app sessions visually separated in the sessions dashboard.

---

## [3.0.1] - 2026-01-02

### 🚀 Railway Production Configuration

**Release:** v3.0.1 Production Patch  
**Commits:**
- `fix: environment variables para Railway`
- `fix: eliminar URLs hardcodeadas en ScreenMonitorModal`

#### 🌐 Environment Variables
- ✅ **.env.example** completamente documentado:
  - `ADMIN_API_KEY` (no API_KEY) - Autenticación con backend
  - `NEXT_PUBLIC_BACKEND_URL` - Backend API URL
  - `NEXT_PUBLIC_WS_URL` - WebSocket server para monitoreo real-time
  - Secciones separadas para Development y Production (Railway)

- ✅ **.env.railway.example** con URLs de producción:
  ```env
  ADMIN_API_KEY=your-admin-key-from-backend
  NEXT_PUBLIC_BACKEND_URL=<URL-del-backend>
  NEXT_PUBLIC_WS_URL=wss://<host-del-backend>
  ```

#### 🔧 URLs Hardcodeadas Eliminadas
- ✅ `components/ScreenMonitorModal.tsx`:
  - **Antes**: `http://localhost:7000` hardcodeado
  - **Después**: `process.env.NEXT_PUBLIC_BACKEND_URL`
  - Fix crítico para screen recording stream en producción

#### 📋 Documentación Mejorada
- ✅ Instrucciones claras de configuración en `.env.example`
- ✅ Diferenciación entre variables públicas (NEXT_PUBLIC_*) y privadas
- ✅ Notas sobre variables build-time vs runtime en Next.js

### Breaking Changes
- ⚠️ Variable renombrada: `API_KEY` → `ADMIN_API_KEY` (consistencia con backend)
- ⚠️ Todas las variables `NEXT_PUBLIC_*` son requeridas en build time

---

## [3.0.0] - 2025-12-21 (Build Final)

### 🎥 WebRTC Live Viewer + Auditoría Legal + Ubicación Enterprise

**Release:** v3.0.0 Final  
**Commits:**
- `feat: v3.0.0 - WebRTC viewer + audit + location history`
- `feat: sistema completo de ubicación enterprise v3.0`
- `docs: estrategia comercial y pricing completo LATAM/México`

#### Nueva Ruta: `/dashboard/live/:sessionId`
- ✅ Viewer WebRTC (recibe tracks del publisher)
- ✅ Video/audio en tiempo real con `<video autoPlay playsInline>`
- ✅ Indicadores dinámicos de tracks (camera, mic, screen ON/OFF)
- ✅ Reconectar sesión, terminar sesión
- ✅ Info de conexión: publisher online/offline, estado WebRTC

#### Nueva Ruta: `/dashboard/audit`
- ✅ Filtros: QR ID, Session ID, Event Type, Date From, Date To
- ✅ Desktop: tabla completa con 7 columnas (fecha, evento, actor, QR, sesión, IP, severidad)
- ✅ Mobile: cards responsivas con toda la info
- ✅ Badges de severidad: critical (rojo), warning (amarillo), info (azul)
- ✅ Integración con `AdminAPI.getAuditLogs()`

#### Archivos Nuevos
- `app/dashboard/live/[sessionId]/page.tsx` (258 líneas)
  - WebRTC Viewer completo con ICE/STUN
  - Socket.IO `/realtime` role: "viewer"
  - `pc.ontrack` → muestra video/audio en `<video>`
  - Eventos: publisher-ready, webrtc-offer, webrtc-answer, webrtc-ice, tracks-update
- `app/dashboard/audit/page.tsx` (247 líneas)
  - UI filtros + tabla + cards móvil
  - Paginación (limit 100 por defecto)
  - Badge colors dinámicos según severity

#### Archivos Actualizados
- `lib/admin-api.ts`
  - Nuevo método: `getAuditLogs(filtersStr)` → `GET /audit/logs`

#### Flujo Live Viewer
1. Admin abre `/dashboard/live/:sessionId`
2. Socket.IO conecta → `/realtime` (role: "viewer")
3. Escucha evento `publisher-ready` → emite `webrtc-start`
4. Recibe `webrtc-offer` → responde con `webrtc-answer`
5. `pc.ontrack` → muestra video/audio en elemento `<video>`
6. Actualiza estado tracks con evento `tracks-update`

#### Variables Env Requeridas
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:7000
NEXT_PUBLIC_REALTIME_URL=http://localhost:7000/realtime
ADMIN_API_KEY=your-api-key-here
```

#### Dependencias
- `socket.io-client: ^4.6.1` ✅ Ya instalado
- `qrcode: ^1.5.3` ✅ Ya instalado

#### Breaking Changes
- ❗ Requiere Backend v3.0.0+ con RealtimeModule + AuditModule + LocationTrackModule

---

### 📍 Sistema de Ubicación Enterprise (Location History + Alerts + Reports)

#### Componente: RouteHistory
- ✅ **Visualización de rutas GPS** con Leaflet + OpenStreetMap
- ✅ **Métricas avanzadas**:
  - Distancia total (km)
  - Duración activa (hh:mm:ss)
  - Velocidad promedio y **velocidad máxima** (km/h en rojo)
  - Calidad de precisión: % exacta (GPS ≤20m), % aproximada (WiFi 21-200m), % baja (IP >200m)
- ✅ **Barra visual de calidad**: Verde/Amarillo/Rojo con porcentajes
- ✅ **Playback de ruta**: Control de reproducción con timestamps
- ✅ **Exportación**:
  - GeoJSON (compatible GIS)
  - CSV (Excel)
  - **HTML Report profesional** con estadísticas, calidad visual, timestamps, footer ISO 19115

#### Componente: LocationAlerts (Nuevo)
- ✅ **Alertas en tiempo real** vía WebSocket
- ✅ **Tipos de alertas**:
  - 📉 PRECISION_DROP: accuracy > 200m (warn)
  - ⚡ SPEED_ANOMALY: velocidad > 60 m/s = 216 km/h (warn)
  - 🚀 JUMP_ANOMALY: salto > 500m en < 5s (high)
  - ⏰ LOCATION_STALE: sin actualización > 5 min
- ✅ **UI de severidad**: Bordes rojos (high), amarillos (warn), verdes (sin alertas)
- ✅ **Metadata detallada**: accuracy, metros, segundos, km/h según tipo
- ✅ **Mantiene últimas 20 alertas** en estado local
- ✅ **Integración WebSocket**: Escucha evento "session:event" con type="alert"

#### Nuevos Endpoints Admin
```typescript
AdminAPI.getLocationStats(sessionId)    // Estadísticas + quality metrics
AdminAPI.getLocationHistory(sessionId)  // Puntos GPS completos
AdminAPI.exportGeoJSON(sessionId)       // GeoJSON para GIS
AdminAPI.exportCSV(sessionId)           // CSV para Excel
AdminAPI.exportReport(sessionId)        // HTML Report profesional
```

#### Archivos Nuevos
- `components/RouteHistory.tsx` (actualizado con velocity máxima + quality bar + export report)
- `components/LocationAlerts.tsx` (130 líneas - NEW)
  * Props: socket (Socket.IO client), sessionId
  * State: alerts array (max 20)
  * Alert type: type, severity, message, timestamp, meta
  * Helpers: getSeverityColor, getSeverityIcon, getTypeIcon
  * Renders: empty state verde vs lista scrollable de alertas

#### Microservicio: location-track (Puerto 5008)
- ✅ **MongoDB TimeSeries** collection para puntos GPS
- ✅ **Funciones avanzadas**:
  - `compute_advanced_stats(points)`: Calcula distancia (haversine), velocidades, calidad %
  - `evaluate_alerts(last_point, prev_point)`: Detecta anomalías en tiempo real
- ✅ **Endpoints**:
  - `POST /track/point` - Guardar punto GPS
  - `GET /track/history/:sessionId` - Historial completo
  - `GET /track/stats/:sessionId` - Estadísticas + maxSpeedKmh + quality object
  - `POST /track/alerts/evaluate` - Evaluar alertas (llamado por Backend)
  - `GET /track/report/:sessionId` - Generar HTML report profesional

#### Cálculos Enterprise
- **Distancia**: Suma de haversine entre puntos consecutivos (precisión métrica)
- **Velocidad máxima**: Máximo d/dt entre todos los segmentos (m/s → km/h)
- **Calidad GPS**:
  * Exact: accuracy ≤ 20m (GPS standard)
  * Approx: 21-200m (WiFi typical)
  * Low: > 200m (IP/cell tower)
- **Alertas**:
  * Precision: threshold 200m (detección entrada edificio)
  * Speed: threshold 60 m/s = 216 km/h (límite físico humano sin vehículo)
  * Jump: threshold 500m in < 5s (pérdida señal GPS típica)

#### Integración Backend
- ✅ **AdminController** con rutas `/admin/location/*`
- ✅ **InternalClient** con método `trackPoint()` para microservicio
- ✅ **TODO**: trackAlerts() call en locationRealtime() (pendiente integración)

#### Retención y Compliance
- ✅ MongoDB TTL index configurable (90-365 días según GDPR)
- ✅ Auditoría de accesos (quién consultó qué ruta, cuándo)
- ✅ ISO 19115 reference en reports (metadata geográfico internacional)

---

## [2.1.0] - 2025-01-21

### 🚀 Enterprise Features Implementation

#### New Pages & Routes
- **QR Detail Page** (`/dashboard/qrs/[id]`)
  - Vista detallada individual de cada QR
  - 3 cards: Estado, Permisos, Sesiones activas
  - Acciones: Pausar/Activar, Descargar, Eliminar
  - Botón "Volver" al dashboard
  - Responsive (desktop 3 cols, mobile stack)

- **Active Sessions Page** (`/dashboard/sessions`)
  - Vista de todas las sesiones activas en tiempo real
  - Auto-refresh cada 5 segundos
  - Filtro por QR (query param: `?qrId=xxx`)
  - Kill session con confirmación
  - Tabla responsive (desktop) + Cards (mobile)

#### New Components
- **QR Detail Components** (`components/admin/qr/`)
  - `QRHeader.tsx` - Header con acciones y confirmaciones
  - `QRStatusCard.tsx` - Card de estado con badge dinámico
  - `QRPermissionsCard.tsx` - Card de permisos con iconos
  - `QRSessionCard.tsx` - Card de sesiones con duración

- **Sessions Components** (`components/admin/sessions/`)
  - `SessionsTable.tsx` - Tabla responsive con vista desktop/mobile
  - Iconos de permisos (camera, mic, location, screen)
  - Badges de estado (Active/Streaming/Paused)
  - Kill session con AlertDialog

- **Dashboard Components** (`components/admin/dashboard/`)
  - `MetricCard.tsx` - Card reutilizable para métricas
  - Iconos con colores diferenciados
  - Soporte para descripción opcional

#### Admin API Layer
- **Created** `lib/admin-api.ts` - Capa única de acceso al backend
  - Centraliza todas las llamadas HTTP
  - Headers automáticos (API key, Request ID)
  - Manejo consistente de errores
  - Cache: `no-store` (siempre datos frescos)
  - TypeScript types: `QRDetail`, `ActiveSession`, `AdminMetrics`, `AuditLog`

#### API Endpoints Integrated
```typescript
AdminAPI.getQR(id)              // Detalle de QR
AdminAPI.getAllQRs()            // Lista todos los QRs
AdminAPI.toggleQR(id)           // Pausar/Activar QR
AdminAPI.deleteQR(id)           // Eliminar QR
AdminAPI.createQR(config)       // Crear nuevo QR

AdminAPI.getActiveSessions()    // Sesiones activas
AdminAPI.getQRSessions(qrId)    // Sesiones de un QR
AdminAPI.killSession(id)        // Terminar sesión
AdminAPI.getSession(id)         // Detalle de sesión

AdminAPI.getMetrics()           // Métricas del dashboard
AdminAPI.healthCheck()          // Health check
AdminAPI.getAuditLogs(filters)  // Logs de auditoría
```

#### UX Improvements
- **Auto-refresh**: Sessions page se actualiza cada 5s
- **Toast notifications**: Feedback en todas las acciones
- **Confirmation dialogs**: AlertDialog para acciones destructivas
- **Loading states**: Skeleton components mientras carga
- **Empty states**: Mensajes claros cuando no hay datos
- **Navigation**: Botón "Volver" y navegación entre páginas
- **Manual refresh**: Botón en sessions page

#### Responsive Design
- **QR Detail**: 3 columnas (lg+) → stack vertical (mobile)
- **Sessions Table**:
  - Desktop: Tabla completa con 7 columnas
  - Mobile: Cards con información condensada
  - Hidden columns en tablet (lg:table-cell)
- **Buttons**: Texto oculto en móvil (icon only)
- **Overflow**: Controlled horizontal scroll

#### Dark Mode Support
- CSS variables en todos los componentes nuevos
- Badges con colores adaptativos
- Consistent con theme system

#### TypeScript Improvements
- Unified interfaces across components
- Type-safe API calls
- Proper error handling types
- Generic `clientFetch<T>` helper

### 🛠️ Technical Details
- **Suspense boundary** para useSearchParams (evita build errors)
- **Permission icons** mapping system
- **Duration calculation** helpers
- **Status badges** con iconos y colores
- **Request correlation** con X-Request-ID

### 📚 Documentation
- Comprehensive inline comments
- JSDoc for public functions
- Type definitions exported

### 🔧 Configuration
- Environment variables:
  - `NEXT_PUBLIC_BACKEND_URL` - Backend API URL
  - `ADMIN_API_KEY` - Admin authentication key

### Routes Summary
```
/dashboard              → Lista QRs (existente, mejorado)
/dashboard/qrs/[id]     → Detalle de QR (nuevo)
/dashboard/sessions     → Sesiones activas (nuevo)
```

### Build Stats
- Dashboard: 126 kB first load
- QR Detail: 125 kB first load
- Sessions: 115 kB first load
- ✅ Production build successful

---

## [2.0.0] - 2025-01-XX

### 🎨 Major UI/UX Overhaul

#### New Components
- **Sidebar Navigation** (`components/Sidebar.tsx`)
  - Fixed sidebar for desktop (lg: breakpoint)
  - Active route highlighting
  - Navigation: QRs, Sessions, Settings
  - Logout button positioned at bottom

- **Mobile Sidebar** (`components/MobileSidebar.tsx`)
  - Sheet drawer for mobile navigation
  - Hamburger menu trigger
  - Responsive design (hidden on lg+)

- **Professional QR Table** (`components/QRTable.tsx`)
  - Responsive table with horizontal scroll
  - Hidden columns on mobile (md:table-cell)
  - Badge status indicators (Active/Paused)
  - Button hierarchy:
    - View: Ghost button with Eye icon
    - Toggle: Outline button (Play/Pause)
    - Download: Ghost button with Download icon
    - Delete: Destructive button with confirmation
  - Empty state with icon and message
  - AlertDialog for delete confirmation

- **Dashboard Layout** (`app/dashboard/layout.tsx`)
  - Fixed sidebar on desktop (lg+)
  - Mobile header with drawer
  - Consistent spacing (p-4, p-6)
  - Background: bg-muted/40

#### Refactored Dashboard
- **Stats Cards**
  - Total QRs counter
  - Active QRs counter
  - Active Sessions counter
  - Icons with proper colors (blue, green, purple)

- **Button Hierarchy**
  - Primary: Create New QR (blue-600, prominent)
  - Secondary: Action buttons (outline variant)
  - Danger: Delete actions (destructive variant)
  - Ghost: View/Download (minimal)

- **UX Improvements**
  - Loading states with Skeleton components
  - Toast notifications for all actions
  - Confirmation dialogs for destructive operations
  - Error handling with user-friendly messages
  - Empty states with helpful CTAs

#### Responsive Design
- **Breakpoints**
  - Mobile: < 640px (sm)
  - Tablet: 640px - 1024px (md)
  - Desktop: 1024px+ (lg)

- **Responsive Features**
  - Sidebar: Fixed on lg+, Sheet drawer on mobile
  - Table: Horizontal scroll on mobile
  - Buttons: Text hidden on mobile (icon only)
  - Cards: Full width on mobile, grid on desktop
  - Headers: Mobile hamburger menu

#### Dark Mode Support
- CSS variables for all colors (bg-background, bg-muted, text-foreground)
- Consistent with Tailwind + shadcn/ui theme system
- Proper contrast ratios for accessibility

#### Spacing System
- Mobile: p-4, gap-2 (16px, 8px)
- Desktop: p-6, gap-4 (24px, 16px)
- Cards: p-4 mobile, p-6 desktop
- Consistent throughout all components

### 🛠️ Technical Improvements
- Added shadcn/ui components:
  - `skeleton` - Loading states
  - `badge` - Status indicators
  - `table` - Data display
  - `sheet` - Mobile drawer
  - `toast` - Notifications
  - `alert-dialog` - Confirmations
  - `toaster` - Toast container

- TypeScript improvements:
  - Unified QRCode interface across components
  - Proper type safety for all props
  - Fixed import paths (use-toast from hooks)

- Build optimizations:
  - Successful production build
  - Route size: Dashboard 126 kB first load
  - Proper code splitting

### 📚 Documentation
- Created `README-UI-IMPROVEMENTS.md` with:
  - Complete architecture overview
  - Before/After comparison
  - Implementation guide
  - Testing checklist
  - Usage instructions

### 🔧 Configuration
- Added `components.json` for shadcn/ui
- Updated `tailwind.config.ts` with new color variables
- Updated `app/globals.css` with CSS variables
- Toaster added to root layout

### Migration Notes
- Old dashboard page backed up as `page-old.tsx`
- New dashboard activated in `page.tsx`
- All existing functionality preserved
- Backward compatible with existing API routes

---

## [1.0.0] - Initial Release

- Basic dashboard with QR management
- Authentication system
- WebSocket integration for streaming
- Session monitoring
- API routes for QR CRUD operations



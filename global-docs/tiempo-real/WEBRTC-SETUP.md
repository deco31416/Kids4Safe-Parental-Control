esto # 🎥 Kids4Safe v3.0 - Sistema WebRTC Meet/Zoom-like

## 📋 Tabla de Contenidos
- [Nuevas Funcionalidades](#nuevas-funcionalidades)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Módulos Backend](#módulos-backend)
- [Frontend](#frontend)
- [Producción](#producción)

---

## 🎯 Nuevas Funcionalidades (v3.0)

### 1️⃣ WebRTC Real-time Streaming (tipo Meet/Zoom)
- ✅ Streaming P2P de cámara, micrófono y pantalla (no frames base64)
- ✅ Múltiples viewers simultáneos (admins pueden ver y escuchar en vivo)
- ✅ Signaling server con Socket.IO (`/realtime` namespace)
- ✅ ICE/STUN support (TURN opcional para enterprise)

### 2️⃣ "Embudo" (Live QR → Destino en otra pestaña)
- ✅ Usuario escanea QR → `/live/:qrId`
- ✅ Acepta permisos (consent modal con texto legal)
- ✅ Inicia transmisión (cám/mic/pantalla)
- ✅ Botón "Continuar" → abre `destinationUrl` en **nueva pestaña**
- ✅ Transmisión sigue viva mientras usuario navega en destino

### 3️⃣ Auditoría Legal (Gobierno/KYC)
- ✅ AuditModule con MongoDB
- ✅ Eventos registrados:
  - `QR_CREATED`, `QR_SCANNED`
  - `SESSION_JOINED`, `CONSENT_ACCEPTED`
  - `PERMISSION_*_GRANTED` (camera, mic, screen, location)
  - `DESTINATION_OPENED`
  - `RECORDING_STARTED`, `RECORDING_UPLOADED`
  - `ADMIN_KILLED_SESSION`
- ✅ UI Admin Panel: `/dashboard/audit` con filtros (QR, sesión, evento, fecha)

### 4️⃣ Grabación con Cloudinary
- ✅ RecordingsModule con signed upload
- ✅ Frontend graba con `MediaRecorder` (webm)
- ✅ Sube directo a Cloudinary (no satura backend)
- ✅ Metadata guardada en MongoDB

### 5️⃣ QR "Especiales" (Políticas Avanzadas)
- ✅ `policyType`: STANDARD, KYC_STRICT, SCREEN_ONLY, ONE_TIME, MULTI_USE
- ✅ `permissionsRequired`: camera, mic, screen, location, orientation
- ✅ `ttlSeconds`: QR expira en X segundos
- ✅ `maxUses`: 1 = one-time, -1 = unlimited
- ✅ `purposeText`: texto legal para consent modal
- ✅ `consentVersion`: versión del texto legal

### 6️⃣ Admin Panel WebRTC Live Viewer
- ✅ `/dashboard/live/:sessionId`
- ✅ Ver y escuchar stream en tiempo real
- ✅ Indicadores de tracks (cámara, mic, pantalla)
- ✅ Reconectar, terminar sesión

### 7️⃣ Recolección de Info Usuario (Web Permitido)
- ✅ IP (backend desde request)
- ✅ User-Agent, language, timezone
- ✅ Ubicación GPS (solo con consent explícito)
- ✅ Device info (platform, browser)

---

## 🏗️ Arquitectura

```
┌──────────────────────────────────────┐
│  Usuario escanea QR → /live/:qrId    │
│  - Consent modal                     │
│  - getUserMedia() (cám/mic)          │
│  - getDisplayMedia() (pantalla)      │
│  - WebRTC Publisher                  │
│  - Heartbeat → backend (12s)         │
└──────────┬───────────────────────────┘
           │ Signaling (Socket.IO)
           ▼
┌──────────────────────────────────────┐
│  Backend NestJS (port 7000)          │
│  - RealtimeGateway (/realtime)       │
│    * join-session (rooms)            │
│    * webrtc-offer/answer/ice         │
│  - SessionModule (Redis TTL)         │
│  - AuditModule (MongoDB)             │
│  - RecordingsModule (Cloudinary)     │
│  - QRModule (políticas especiales)   │
└──────────┬───────────────────────────┘
           │ Signaling (Socket.IO)
           ▼
┌──────────────────────────────────────┐
│  Admin Panel → /dashboard/live/:id   │
│  - WebRTC Viewer                     │
│  - Recibe tracks (video/audio) P2P   │
│  - Puede kill session                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Destino (tab 2)                     │
│  window.open(destinationUrl)         │
│  Usuario continúa flujo normal       │
│  (Pestaña /live sigue transmitiendo) │
└──────────────────────────────────────┘
```

**Nota:** El video/audio **NO pasa por el backend** (va P2P por WebRTC). El backend solo coordina la negociación.

---

## 📦 Instalación

### Requisitos
- Node.js 18+
- MongoDB
- Redis
- pnpm (recomendado)

### 1️⃣ Clonar repo
```bash
git clone https://github.com/tuusuario/QR-MONITOR.git
cd Kids4Safe
```

### 2️⃣ Backend
```bash
cd backend
pnpm install

# Copiar configuración local
cp .env.example .env.local
# Editar .env.local (ver sección Configuración)

# Iniciar
yarn start:dev
```

### 3️⃣ Frontend
```bash
cd frontend
pnpm install

# Copiar .env
cp .env.example .env.local
# Editar .env.local

# Iniciar
pnpm dev
```

### 4️⃣ Admin Panel
```bash
cd admin-panel
pnpm install

# Copiar .env
cp .env.example .env.local
# Editar .env.local

# Iniciar
pnpm dev
```

---

## ⚙️ Configuración

### Backend `.env.local`
```env
PORT=7000

MONGODB_URI=mongodb://localhost:27017/QR-MONITOR
REDIS_URL=redis://localhost:6379

JWT_SECRET=<jwt-secret-seguro-32-caracteres-minimo>
ADMIN_API_KEY=<admin-api-key-compartida>

# Cloudinary (para grabaciones)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>

FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3002
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:7000
NEXT_PUBLIC_REALTIME_URL=http://localhost:7000/realtime
```

### Admin Panel `.env.local`
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:7000
NEXT_PUBLIC_REALTIME_URL=http://localhost:7000/realtime
BACKEND_URL=http://localhost:7000
ADMIN_API_KEY=<admin-api-key-compartida>
```

---

## 🚀 Uso

### 1️⃣ Crear QR Especial (Admin Panel)
```bash
POST /qr/create
{
  "name": "KYC Video",
  "destinationUrl": "https://example.com/form",
  "policyType": "KYC_STRICT",
  "policies": {
    "permissionsRequired": ["camera", "mic"],
    "permissionsOptional": ["screen", "location"],
    "ttlSeconds": 600,
    "maxUses": 1,
    "purposeText": "Para verificación de identidad",
    "consentVersion": "1.0"
  }
}
```

### 2️⃣ Usuario escanea QR
- Abre: `http://localhost:3000/live/:qrId`
- Ve consent modal con `purposeText`
- Acepta → inicia transmisión
- Click "Continuar" → abre `destinationUrl` en nueva pestaña

### 3️⃣ Admin ve stream en vivo
- Abre: `http://localhost:3002/dashboard/live/:sessionId`
- Ve y escucha en tiempo real
- Puede terminar sesión

### 4️⃣ Auditoría
- Admin Panel: `/dashboard/audit`
- Filtros: QR, sesión, evento, fecha
- Export (próximamente)

---

## 🧩 Módulos Backend

### `RealtimeModule` (`/realtime`)
- WebRTC signaling (Socket.IO)
- Eventos: `join-session`, `webrtc-offer`, `webrtc-answer`, `webrtc-ice`
- Rooms: 1 publisher + N viewers

### `AuditModule` (`/audit`)
- Logs legales en MongoDB
- Endpoints:
  - `GET /audit/logs?qrId=&sessionId=&eventType=`
  - `GET /audit/session/:id` (timeline completo)
  - `GET /audit/qr/:id` (logs de un QR)
  - `GET /audit/stats` (dashboard)

### `RecordingsModule` (`/recordings`)
- Cloudinary signed uploads
- Endpoints:
  - `POST /recordings/init` → firma
  - `POST /recordings/finish` → guarda metadata
  - `GET /recordings/session/:id`
  - `GET /recordings/qr/:id`

### `SessionModule` (`/session`)
- Redis TTL (30s, renovado por heartbeat)
- Endpoint clave: **`POST /session/qr/:id/join`**
  - Valida QR (activo, no expirado, maxUses)
  - Retorna: `sessionId`, `destinationUrl`, `policy`

### `QRModule` (`/qr`)
- QR con políticas especiales
- Campos nuevos:
  - `destinationUrl`
  - `policyType`
  - `expiresAt`
  - `policies.permissionsRequired`
  - `policies.ttlSeconds`
  - `policies.maxUses`

---

## 🌐 Frontend

### `/live/:qrId` (Frontend)
- Componente: `Frontend/src/app/live/[qrId]/page.tsx`
- Flujo:
  1. `POST /session/qr/:qrId/join` → obtiene config
  2. Consent modal
  3. `getUserMedia()` / `getDisplayMedia()`
  4. Conecta a `/realtime` como `publisher`
  5. WebRTC: `pc.addTrack()` → `createOffer()`
  6. Heartbeat cada 12s
  7. Botón "Continuar" → `window.open(destinationUrl)`

### `/dashboard/live/:sessionId` (Admin Panel)
- Componente: `Admin-Panel/app/dashboard/live/[sessionId]/page.tsx`
- Flujo:
  1. Conecta a `/realtime` como `viewer`
  2. `webrtc-start` → publisher crea offer
  3. `webrtc-answer` → completa negociación
  4. `pc.ontrack` → muestra video/audio

### `/dashboard/audit` (Admin Panel)
- Componente: `Admin-Panel/app/dashboard/audit/page.tsx`
- Filtros: QR, sesión, evento
- Desktop: tabla
- Mobile: cards

---

## 🏭 Producción

### 1️⃣ HTTPS obligatorio
WebRTC requiere HTTPS en producción (o localhost).

### 2️⃣ TURN Server
Para redes corporativas o moviles dificiles, WebRTC usa TURN desde el backend:

```text
GET /webrtc/ice-servers
```

Configurar Metered solo en el backend con `METERED_TURN_APP_NAME`, `METERED_TURN_CREDENTIAL_API_KEY`, `METERED_TURN_USERNAME` y `METERED_TURN_PASSWORD`. Frontend, admin panel y app movil consumen ese endpoint y solo usan `NEXT_PUBLIC_ICE_SERVERS_JSON` / `EXPO_PUBLIC_ICE_SERVERS_JSON` como fallback local.

### 3️⃣ Dominios
```env
# Backend
FRONTEND_URL=https://app.tudominio.com
ADMIN_URL=https://admin.tudominio.com

# Frontend
NEXT_PUBLIC_BACKEND_URL=https://api.tudominio.com
NEXT_PUBLIC_REALTIME_URL=https://api.tudominio.com/realtime
```

### 4️⃣ Cloudinary
Crea cuenta gratuita: https://cloudinary.com/
```env
CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
```

### 5️⃣ MongoDB + Redis
- MongoDB Atlas (gratis 512 MB)
- Redis Cloud (gratis 30 MB)

---

## 📚 Documentación Adicional

Ver `global-docs/` para:
- `WEBSOCKET-AUTH.md` - Autenticación WebSocket
- `SECURITY-AUTH.md` - Seguridad backend
- `SESSION-GATED-CONTENT.md` - Flujo embudo
- `DEPLOYMENT.md` - Deploy paso a paso

---

## 🧪 Testing

```bash
# Backend
cd backend
pnpm test

# Frontend
cd frontend
pnpm test
```

---

## 🐛 Troubleshooting

### WebRTC no conecta
1. Verifica que `/realtime` esté accesible (ws://localhost:7000/realtime)
2. Revisa logs backend: `Publisher online`
3. Revisa consola browser: `PC state: connected`
4. Si falla en móvil/empresa: necesitas TURN

### Pantalla no se comparte
`getDisplayMedia()` requiere **click del usuario** (no automático).

### Grabación no funciona
1. Verifica Cloudinary config en `.env.local`
2. Revisa logs: `POST /recordings/init`
3. Verifica CORS en Cloudinary dashboard

### Audit logs vacíos
AuditModule registra eventos **silenciosamente** (no rompe flujo principal).
Si no ves logs, verifica MongoDB conectado.

---

## 📞 Soporte

- GitHub Issues: https://github.com/tuusuario/QR-MONITOR/issues
- Documentación: `global-docs/`

---

## 📄 Licencia

MIT

---

**¡Listo para Meet/Zoom-like en web!** 🎥🚀

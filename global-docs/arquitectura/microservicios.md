> Nota 2026-06-12: este documento es una referencia historica/snapshot tecnico. Para configuracion operativa vigente, URLs Railway, secretos y comandos actuales, usar `README.md` y `DEPLOYMENT.md` de `global-docs`.

# Kids4Safe Microservicios v3.0.0

Sistema enterprise de 7 microservicios Python (FastAPI) para Kids4Safe.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Live (QR)                       │
│              WebRTC Publisher + Consent Modal                │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──► Device Context Service (5001)
             ├──► Location & Geofence Service (5002)
             ├──► Recording Orchestrator (5003) → Cloudinary
             ├──► Realtime Signaling (Backend NestJS WebSocket)
             └──► Session Orchestrator (5005) ← Heartbeat 12s
                             │
                             │
┌────────────────────────────┼────────────────────────────────┐
│            Backend Core    │                                 │
│                            ▼                                 │
│    ┌──────────────────────────────────────────┐            │
│    │   Session Orchestrator (Redis TTL)       │            │
│    │   - Crea sesión                          │            │
│    │   - Heartbeat (renueva TTL 30s)          │            │
│    │   - Detecta dropped                      │            │
│    └──────────────┬───────────────────────────┘            │
│                   │                                         │
│    ┌──────────────┼──────────────┬──────────────────────┐ │
│    │              │               │                      │ │
│    ▼              ▼               ▼                      ▼ │
│  Policy       Audit Log      Device          Location      │
│  Engine       Service        Context         Geofence      │
│  (5007)       (5006)         (5001)          (5002)        │
│  Stateless    MongoDB        Redis           Redis         │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Admin Panel    │
                    │  - Live Viewer  │
                    │  - Audit UI     │
                    │  - QR Mgmt      │
                    └─────────────────┘
```

## 📦 Microservicios

### 1️⃣ Device Context Service (5001)
**Rol**: Análisis y normalización de dispositivos

**Endpoints**:
- `POST /device/analyze` - Analiza User-Agent, capabilities, context
- `GET /device/{session_id}` - Obtiene context guardado

**Stack**: FastAPI + Redis (TTL 5min)

**Output**:
```json
{
  "device_type": "mobile",
  "os": {"name": "Android", "version": "14"},
  "browser": {"name": "Chrome", "version": "120"},
  "capabilities": {
    "camera": true,
    "microphone": true,
    "screenShare": false,
    "geolocation": true
  },
  "confidence": "medium"
}
```

---

### 2️⃣ Location & Geofence Service (5002)
**Rol**: GPS + geofencing para KYC/gobierno

**Endpoints**:
- `POST /location/save` - Guarda ubicación (TTL 120s)
- `GET /location/{session_id}` - Obtiene ubicación actual
- `GET /location/{session_id}/history` - Historial de ubicaciones
- `POST /geofence/check` - Verifica si está dentro de fence

**Stack**: FastAPI + Redis (TTL 120s)

**Geofencing**:
- Círculo: `{lat, lng, radius_meters}`
- Distancia haversine (metros)

---

### 3️⃣ Recording Orchestrator Service (5003)
**Rol**: Orquesta grabaciones → Cloudinary (signed upload)

**Endpoints**:
- `POST /recordings/init` - Genera firma Cloudinary
- `POST /recordings/finish` - Guarda metadata

**Stack**: FastAPI + Cloudinary API

**Flujo**:
1. Cliente pide firma
2. Cliente sube webm directo a Cloudinary
3. Cliente llama finish con URL

---

### 4️⃣ Realtime Signaling Service
**Rol**: WebRTC signaling P2P

**Ubicación**: Ya implementado en Backend NestJS (Socket.IO)
- `RealtimeGateway` namespace `/realtime`
- Roles: publisher / viewer
- Events: offer, answer, ICE

---

### 5️⃣ Session Orchestrator Service (5005) 🧠 **CEREBRO**
**Rol**: Mantiene estado de sesiones con Redis TTL

**Endpoints**:
- `POST /session/create` - Crea sesión (TTL 30s)
- `POST /session/{id}/heartbeat` - Renueva TTL (cada 12s)
- `POST /session/{id}/stop` - Detiene sesión
- `GET /session/{id}` - Obtiene metadata
- `GET /sessions/active` - Lista sesiones activas

**Stack**: FastAPI + Redis (TTL 30s)

**Estado**:
```json
{
  "session_id": "...",
  "qr_id": "...",
  "status": "active",
  "last_seen_at": 1730000000,
  "stream": {"camera": true, "mic": true, "screen": false}
}
```

---

### 6️⃣ Audit Log Service (5006) 📜 **OBLIGATORIO**
**Rol**: Registro de eventos para gobierno/KYC

**Endpoints**:
- `POST /audit/event` - Escribe evento (NUNCA falla)
- `GET /audit/search` - Búsqueda por filtros
- `GET /audit/session/{id}/timeline` - Timeline de sesión
- `GET /audit/stats` - Estadísticas (dashboard)

**Stack**: FastAPI + MongoDB (índices optimizados)

**Eventos**:
- QR_SCANNED
- CONSENT_ACCEPTED
- PERMISSION_CAMERA_GRANTED
- PERMISSION_MIC_GRANTED
- PERMISSION_SCREEN_GRANTED
- PERMISSION_LOCATION_GRANTED
- DESTINATION_OPENED
- RECORDING_UPLOADED
- SESSION_DROPPED
- ADMIN_VIEWER_JOINED

---

### 7️⃣ Policy Engine Service (5007) ⚖️ **DIFERENCIADOR**
**Rol**: Decisiones de permisos según policy + device + geo

**Endpoints**:
- `POST /policy/evaluate` - Evalúa y retorna decisiones
- `POST /policy/validate-permissions` - Valida permisos otorgados

**Stack**: FastAPI (stateless, sin DB)

**Input**:
```json
{
  "qr_policy": {"policyType": "KYC_STRICT", "permissionsRequired": ["camera", "mic", "location"]},
  "device_context": {...},
  "session_state": {...},
  "geo": {"lat": 4.651, "lng": -74.083, "isInsideFence": true}
}
```

**Output**:
```json
{
  "allow_camera": true,
  "allow_mic": true,
  "allow_screen": false,
  "require_screen": false,
  "allow_continue": true,
  "reason": "ok"
}
```

---

## 🚀 Instalación

### 1. Instalar shared utilities
```bash
cd Kids4Safe
pip install -r shared/requirements.txt
```

### 2. Instalar cada microservicio
```bash
cd microservicio-device-info
pip install -r requirements.txt
cp .env.example .env.local
# Editar .env.local con tus valores

cd ../microservicio-location
pip install -r requirements.txt
cp .env.example .env.local

cd ../microservicio-session-orchestrator
pip install -r requirements.txt
cp .env.example .env.local

cd ../microservicio-audit-log
pip install -r requirements.txt
cp .env.example .env.local

cd ../microservicio-policy-engine
pip install -r requirements.txt
cp .env.example .env.local
```

### 3. Configurar Redis y MongoDB
```bash
# Redis (requerido por: device-context, location, session-orchestrator)
docker run -d -p 6379:6379 redis:7-alpine

# MongoDB (requerido por: audit-log)
docker run -d -p 27017:27017 mongo:7
```

### 4. Iniciar microservicios
```bash
# Opción 1: Manualmente (cada uno en terminal separado)
cd microservicio-device-info
python main.py

cd microservicio-location
python main_v3.py

cd microservicio-session-orchestrator
python main.py

cd microservicio-audit-log
python main.py

cd microservicio-policy-engine
python main.py

# Opción 2: Con script PowerShell (próximamente)
# .\start-microservices-python.ps1
```

---

## 🔧 Variables de Entorno

Cada microservicio necesita su `.env.local` para desarrollo local:

### Comunes (todos)
```env
SERVICE_NAME=nombre-del-servicio
PORT=500X
ENV=development
ADMIN_API_KEY=<admin-api-key-compartida>
BACKEND_URL=http://localhost:7000
```

### Específicos

**Device Context, Location, Session Orchestrator**:
```env
REDIS_URL=redis://localhost:6379
```

**Audit Log**:
```env
MONGODB_URI=mongodb://localhost:27017/QR-MONITOR
```

**Recording Orchestrator**:
```env
CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
```

---

## 🧪 Testing

### Health checks
```bash
curl http://localhost:5001/health  # Device Context
curl http://localhost:5002/health  # Location
curl http://localhost:5005/health  # Session Orchestrator
curl http://localhost:5006/health  # Audit Log
curl http://localhost:5007/health  # Policy Engine
```

### Docs interactivas
- Device Context: http://localhost:5001/docs
- Location: http://localhost:5002/docs
- Session Orchestrator: http://localhost:5005/docs
- Audit Log: http://localhost:5006/docs
- Policy Engine: http://localhost:5007/docs

---

## 📊 Puertos

| Servicio | Puerto | Crítico | DB |
|----------|--------|---------|-----|
| Device Context | 5001 | Sí | Redis |
| Location & Geofence | 5002 | Sí | Redis |
| Recording Orchestrator | 5003 | No | Cloudinary |
| Streaming (Backend) | 7000 | Sí | - |
| Session Orchestrator | 5005 | **CRÍTICO** | Redis |
| Audit Log | 5006 | **CRÍTICO** | MongoDB |
| Policy Engine | 5007 | Sí | - |

---

## 🔐 Seguridad

### API Keys
Todos los endpoints internos están protegidos con `x-api-key` header.

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  http://localhost:5001/device/analyze
```

### Headers automáticos
Los microservicios capturan automáticamente:
- `request.client.host` → IP
- `request.headers["user-agent"]` → User-Agent

---

## 🎯 Integración con Backend NestJS

El backend debe llamar a estos microservicios:

```typescript
// Backend: src/session/session.controller.ts
@Post('qr/:id/join')
async join(@Param('id') qrId: string, @Req() req: Request) {
  // 1. Validar QR
  const qr = await this.qrService.findById(qrId);
  
  // 2. Llamar Policy Engine
  const policyDecision = await fetch('http://localhost:5007/policy/evaluate', {
    method: 'POST',
    headers: {'x-api-key': process.env.ADMIN_API_KEY},
    body: JSON.stringify({
      qr_policy: qr.policies,
      device_context: null, // TODO: llamar device-context
    })
  });
  
  // 3. Crear sesión en Session Orchestrator
  const session = await fetch('http://localhost:5005/session/create', {
    method: 'POST',
    headers: {'x-api-key': process.env.ADMIN_API_KEY},
    body: JSON.stringify({
      session_id: uuidv4(),
      qr_id: qrId,
      destination_url: qr.destinationUrl
    })
  });
  
  // 4. Log evento en Audit
  await fetch('http://localhost:5006/audit/event', {
    method: 'POST',
    headers: {'x-api-key': process.env.ADMIN_API_KEY},
    body: JSON.stringify({
      qr_id: qrId,
      session_id: session.session_id,
      event_type: 'QR_SCANNED',
      actor_type: 'user',
      severity: 'info'
    })
  });
  
  return { sessionId: session.session_id, destinationUrl: qr.destinationUrl };
}
```

---

## 📈 Producción

### Requerimientos
- Redis: persistencia opcional, pero recomendado RDB snapshots
- MongoDB: replica set para alta disponibilidad
- Cloudinary: cuenta con suficiente storage/bandwidth

### Escalabilidad
- **Stateless**: Policy Engine, Audit Log (write-only), Recording Orchestrator
- **Stateful**: Session Orchestrator (Redis), Device Context (Redis), Location (Redis)

### Monitoreo
Todos exponen `/health` con métricas:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "redis": "connected",
  "version": "3.0.0"
}
```

---

## 🐛 Troubleshooting

### Redis no conecta
```bash
# Verificar Redis
redis-cli ping
# Respuesta esperada: PONG

# Ver puertos
netstat -an | findstr 6379
```

### MongoDB no conecta
```bash
# Verificar MongoDB
mongosh --eval "db.version()"

# Ver puertos
netstat -an | findstr 27017
```

### Servicio no inicia
```bash
# Ver logs
python main.py
# O con más detalle:
uvicorn app.main:app --host 0.0.0.0 --port 5001 --log-level debug
```

---

## 📝 Próximos pasos

- [ ] Script PowerShell para iniciar todos (`start-microservices-python.ps1`)
- [ ] Dockerfile para cada microservicio (opcional)
- [ ] Tests unitarios (pytest)
- [ ] Métricas con Prometheus
- [ ] Dashboard de health checks

---

## 🤝 Contribuir

1. Fork el repo
2. Crea branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'feat: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

---

## 📄 Licencia

Propietario: Kids4Safe\
Proyecto: Kids4Safe v3.0.0 Enterprise

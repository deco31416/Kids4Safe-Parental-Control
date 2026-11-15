# 🏗️ Arquitectura Detallada del Sistema

> Diagramas, flujos de datos y decisiones técnicas

---

## 🎯 Visión General

Kids4Safe es un sistema distribuido de microservicios diseñado para:
1. Generar códigos QR únicos vinculados a sesiones
2. Capturar datos de dispositivos remotos con consentimiento
3. Transmitir en tiempo real mediante WebSockets
4. Procesar y almacenar datos con microservicios especializados
5. Ofrecer un panel de administración centralizado

---

## 📊 Diagrama de Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                         CAPA DE USUARIO                          │
└──────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼─────┐             ┌──────▼──────┐
              │  USUARIO  │             │    ADMIN    │
              │  (Móvil)  │             │  (Desktop)  │
              └─────┬─────┘             └──────┬──────┘
                    │                           │
           Escanea QR                    Gestiona QRs
                    │                           │
                    │                           │
┌───────────────────▼───────────────────────────▼───────────────────┐
│                      CAPA DE PRESENTACIÓN                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │    FRONTEND      │              │   ADMIN PANEL    │         │
│  │   (Next.js 14)   │              │   (Next.js 14)   │         │
│  │                  │              │                  │         │
│  │  • Consentimiento│              │  • CRUD QR Codes │         │
│  │  • Captura       │              │  • Ver Sesiones  │         │
│  │  • WebSocket     │              │  • Monitoreo     │         │
│  │                  │              │                  │         │
│  │  :3000           │              │  :3002           │         │
│  └────────┬─────────┘              └────────┬─────────┘         │
│           │                                 │                    │
└───────────┼─────────────────────────────────┼────────────────────┘
            │                                 │
            │   REST API + WebSocket          │   REST API
            │                                 │
┌───────────▼─────────────────────────────────▼────────────────────┐
│                     CAPA DE APLICACIÓN                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  BACKEND (NestJS)                          │ │
│  │                     Puerto 3001                            │ │
│  │                                                            │ │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────────┐      │ │
│  │  │QR Module  │  │  Session  │  │Stream Gateway    │      │ │
│  │  │           │  │  Module   │  │(WebSocket)       │      │ │
│  │  │• Create   │  │           │  │                  │      │ │
│  │  │• Toggle   │  │• GetOrCr. │  │• camera-frame    │      │ │
│  │  │• Delete   │  │• Heartbeat│  │• screen-frame    │      │ │
│  │  │• GetAll   │  │• Update   │  │• audio-chunk     │      │ │
│  │  └───────────┘  └───────────┘  └──────────────────┘      │ │
│  │                                                            │ │
│  └────────────────────────────┬───────────────────────────────┘ │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                │ HTTP Calls
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    CAPA DE MICROSERVICIOS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │Streaming │  │  Device  │  │ Location │  │   Screen     │  │
│  │          │  │   Info   │  │          │  │   Recorder   │  │
│  │:5001     │  │  :5002   │  │  :5003   │  │   :5004      │  │
│  │          │  │          │  │          │  │              │  │
│  │WebSocket │  │ Analyze  │  │ Geocode  │  │ Save Frames  │  │
│  │Relay     │  │ Risk Det.│  │ History  │  │ Compress     │  │
│  │          │  │          │  │          │  │              │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │             │              │                │          │
└───────┼─────────────┼──────────────┼────────────────┼──────────┘
        │             │              │                │
        └─────────────┴──────────────┴────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                     CAPA DE DATOS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              REDIS (Railway)                            │   │
│  │                                                         │   │
│  │  • qr:{id}                    (QR Codes)               │   │
│  │  • session:{id}               (Sesiones)               │   │
│  │  • location:{id}:history      (GPS)                    │   │
│  │  • device:{id}:analysis       (Device Info)            │   │
│  │  • frames:{id}:camera         (Metadata Frames)        │   │
│  │  • audit:{id}:log             (Audit Trail)            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FILE SYSTEM                                │   │
│  │                                                         │   │
│  │  ./screenshots/                                         │   │
│  │    ├── session_*_camera_*.jpg                          │   │
│  │    └── session_*_screen_*.jpg                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos Completo

### 1. Creación de QR Code

```
Admin → Admin Panel:3002 → Backend:3001 → Redis
                              │
                              ▼
                         POST /api/qr/create
                              │
                              ▼
                         QRService.create()
                              │
                              ├─ Generar ID único (nanoid)
                              ├─ Generar código QR
                              ├─ HSET qr:{id} {...}
                              ├─ SADD qr:all {id}
                              │
                              ▼
                         Response: QR object
```

### 2. Usuario Escanea QR

```
Usuario → Escanea QR
              │
              ▼
        https://app.com/s/abc123def456
              │
              ▼
        Frontend:3000/s/[sessionId]
              │
              ▼
        Página de Consentimiento
              │
        ┌─────┴─────┐
        │           │
    Rechaza     Acepta
        │           │
        ▼           ▼
   Redirige    /s/abc123def456/live
    google
```

### 3. Inicialización de Sesión

```
/s/[sessionId]/live carga
              │
              ▼
    useEffect(() => initializeSession())
              │
              ├─ GET /api/session/abc123def456
              │       │
              │       ▼
              │  SessionService.getOrCreate()
              │       │
              │       ├─ HGET session:abc123def456
              │       ├─ Si no existe: crear nueva
              │       ├─ HINCRBY qr:totalScans +1
              │       ├─ SADD qr:{qrId}:sessions {sessionId}
              │       │
              │       ▼
              │  Response: Session data
              │
              ├─ getDeviceInfo()
              │       │
              │       ▼
              │  POST /api/session/abc123def456/device-info
              │       │
              │       ├─ Backend → POST http://localhost:5002/analyze
              │       │                │
              │       │                ▼
              │       │           microservicio-device-info
              │       │                │
              │       │                ├─ Extraer OS, Browser
              │       │                ├─ Detectar bot
              │       │                ├─ Calcular risk_level
              │       │                ├─ HSET device:{id}:analysis {...}
              │       │                │
              │       │                ▼
              │       │           Response: Analysis
              │       │
              │       ▼
              │  Response: Success
              │
              ▼
    requestAllPermissions()
```

### 4. Solicitud de Permisos

```
requestAllPermissions()
         │
         ├─ handleStartCamera()
         │       │
         │       ├─ navigator.mediaDevices.getUserMedia()
         │       │       │
         │       │       ▼
         │       │  [Navegador solicita permiso]
         │       │       │
         │       │   ┌───┴───┐
         │       │   │       │
         │       │ Permite  Bloquea
         │       │   │       │
         │       │   ▼       ▼
         │       │ Stream   Error
         │       │
         │       ├─ videoRef.srcObject = stream
         │       ├─ POST /api/session/abc/permissions {camera:true}
         │       │
         │       ▼
         │  setCameraActive(true)
         │
         ├─ handleStartScreen()
         │       │
         │       ├─ navigator.mediaDevices.getDisplayMedia()
         │       ├─ POST /api/session/abc/permissions {screen:true}
         │       │
         │       ▼
         │  setScreenActive(true)
         │
         ├─ handleStartMicrophone()
         │       │
         │       ├─ navigator.mediaDevices.getUserMedia()
         │       ├─ AudioRecorder.start()
         │       ├─ POST /api/session/abc/permissions {microphone:true}
         │       │
         │       ▼
         │  setMicActive(true)
         │
         ├─ handleStartLocation()
         │       │
         │       ├─ navigator.geolocation.getCurrentPosition()
         │       ├─ POST /api/session/abc/location {lat,lng}
         │       │       │
         │       │       ├─ Backend → POST http://localhost:5003/update-location
         │       │       │                │
         │       │       │                ▼
         │       │       │           microservicio-location
         │       │       │                │
         │       │       │                ├─ ZADD location:{id}:history
         │       │       │                ├─ Reverse geocode (Nominatim)
         │       │       │                ├─ HSET location:{id}:current
         │       │       │                │
         │       │       │                ▼
         │       │       │           Response: Location + Address
         │       │       │
         │       │       ▼
         │       │  Response: Success
         │       │
         │       ├─ navigator.geolocation.watchPosition()
         │       ├─ POST /api/session/abc/permissions {location:true}
         │       │
         │       ▼
         │  setLocationActive(true)
         │
         ▼
   setCurrentStep('¡Todo listo!')
```

### 5. Transmisión en Tiempo Real

```
useEffect (cameraActive)
         │
         ├─ setInterval(() => {
         │       │
         │       ├─ captureFrameFromStream(videoRef.current)
         │       │       │
         │       │       ├─ canvas.drawImage(video)
         │       │       ├─ canvas.toDataURL('image/jpeg', 0.8)
         │       │       │
         │       │       ▼
         │       │  frame: "data:image/jpeg;base64,..."
         │       │
         │       ▼
         │  socket.emit('camera-frame', {sessionId, frame})
         │       │
         │       ▼
         │  Backend StreamGateway
         │       │
         │       ├─ handleCameraFrame()
         │       ├─ Broadcast a room "session:{id}"
         │       │       │
         │       │       ▼
         │       │  Admin conectado recibe frame
         │       │
         │       ├─ (Opcional) → POST http://localhost:5004/save-frame
         │       │                    │
         │       │                    ▼
         │       │               microservicio-screen-recorder
         │       │                    │
         │       │                    ├─ Decode base64
         │       │                    ├─ PIL resize + compress
         │       │                    ├─ Save to disk
         │       │                    ├─ ZADD frames:{id}:camera
         │       │                    │
         │       │                    ▼
         │       │               Response: Filename
         │       │
         │       ▼
         │  Response: Frame recibido
         │
         ▼
   }, 1000) // Cada 1 segundo

[Similar para screen, audio, location]
```

### 6. Heartbeat Keep-Alive

```
useHeartbeat(sessionId)
         │
         ├─ setInterval(() => {
         │       │
         │       ▼
         │  POST /api/session/abc123def456/heartbeat
         │       │
         │       ▼
         │  SessionService.heartbeat()
         │       │
         │       ├─ HSET session:{id} lastHeartbeat={now}
         │       ├─ Si (now - lastHeartbeat) > 60s:
         │       │    HSET session:{id} status="paused"
         │       │
         │       ▼
         │  Response: {lastHeartbeat}
         │
         ▼
   }, 5000) // Cada 5 segundos
```

### 7. Cierre de Sesión

```
Usuario cierra pestaña
         │
         ▼
   useEffect cleanup
         │
         ├─ stopCamera(videoRef.current)
         ├─ stopScreenCapture(screenStream)
         ├─ stopMicrophone(micStream)
         ├─ navigator.geolocation.clearWatch()
         │
         ├─ POST /api/session/abc123def456/pause
         │       │
         │       ▼
         │  SessionService.pause()
         │       │
         │       ├─ HSET session:{id} status="paused"
         │       ├─ HSET session:{id} endedAt={now}
         │       ├─ HINCRBY qr:{qrId} activeSessions -1
         │       │
         │       ▼
         │  Response: Success
         │
         ▼
   socket.disconnect()
```

---

## 🧩 Decisiones Técnicas

### ¿Por qué Next.js?
- ✅ **SSR/SSG:** SEO-friendly
- ✅ **App Router:** Routing moderno
- ✅ **TypeScript:** Type safety
- ✅ **Despliegue fácil:** Vercel/Railway

### ¿Por qué NestJS?
- ✅ **Arquitectura modular:** Escalable
- ✅ **TypeScript nativo:** Consistencia con Frontend
- ✅ **WebSocket integrado:** Socket.io
- ✅ **Decoradores:** Código limpio

### ¿Por qué Redis?
- ✅ **In-memory:** Ultra rápido
- ✅ **Estructuras ricas:** Hashes, Sets, Sorted Sets
- ✅ **Pub/Sub:** Mensajería en tiempo real
- ✅ **TTL:** Expiración automática

### ¿Por qué Python para microservicios?
- ✅ **FastAPI:** Framework rápido y moderno
- ✅ **Pillow:** Procesamiento de imágenes
- ✅ **aiohttp:** Async HTTP requests
- ✅ **Ecosistema:** Librerías ML/AI futuras

### ¿Por qué WebSocket en lugar de HTTP?
- ✅ **Baja latencia:** Frames en tiempo real
- ✅ **Bidireccional:** Admin puede enviar comandos
- ✅ **Persistente:** Una conexión, muchos mensajes

### ¿Por qué Railway?
- ✅ **Deploy fácil:** Git push to deploy
- ✅ **Redis managed:** Sin configuración
- ✅ **Multiservicio:** Un proyecto, múltiples servicios
- ✅ **Logs centralizados:** Debugging fácil

---

## 📐 Patrones de Diseño Aplicados

### 1. **Microservicios**
Cada servicio Python tiene una responsabilidad única:
- Device Info: Solo análisis de dispositivos
- Location: Solo GPS tracking
- Screen Recorder: Solo almacenamiento de frames

La señalización WebRTC no es un microservicio Python: vive en el
`RealtimeGateway` del backend NestJS y los medios viajan P2P.

### 2. **Gateway Pattern**
Backend NestJS actúa como API Gateway:
- Punto de entrada único
- Routing a microservicios
- Agregación de respuestas

### 3. **Pub/Sub (WebSocket Rooms)**
```typescript
socket.join(`session:${sessionId}`);
server.to(`session:${sessionId}`).emit('frame', data);
```

### 4. **Repository Pattern**
Servicios NestJS acceden a Redis a través de métodos:
```typescript
class SessionService {
  async get(id: string): Promise<Session> { ... }
  async update(id: string, data: Partial<Session>): Promise<void> { ... }
}
```

### 5. **Middleware Pattern**
(Futuro) Autenticación, logging, rate limiting:
```typescript
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
```

---

## 🚀 Escalabilidad

### Horizontal Scaling

#### Backend NestJS
```
Load Balancer
      │
      ├─ Backend Instance 1
      ├─ Backend Instance 2
      └─ Backend Instance 3
            │
            └─ Redis (shared state)
```

#### Microservicios Python
```
API Gateway (NestJS)
      │
      ├─ Device-Info Pool [5002, 5012, 5022]
      ├─ Location Pool [5003, 5013, 5023]
      └─ Screen-Recorder Pool [5004, 5014, 5024]
```

### Vertical Scaling
- **Redis:** Railway Pro plan (más memoria)
- **Backend:** Más CPU/RAM por instancia
- **Microservicios:** Más workers por servicio

### Optimizaciones
- ✅ **Frame rate:** 1 FPS (ajustable)
- ✅ **Frame quality:** JPEG 80% (ajustable)
- ✅ **Frame size:** Max 1280x720
- ✅ **Redis limits:** 100 frames, 100 locations
- ✅ **Heartbeat:** 5 segundos (balance)

---

## 🔮 Roadmap Técnico

### Fase 2
- [ ] JWT Authentication
- [ ] Role-based Access Control (RBAC)
- [ ] Rate Limiting (express-rate-limit)
- [ ] WebRTC para video en vivo (mejor calidad)
- [ ] Notificaciones push (Firebase)

### Fase 3
- [ ] PostgreSQL para datos relacionales
- [ ] S3 para almacenamiento de frames
- [ ] ElasticSearch para búsqueda de logs
- [ ] Grafana para métricas
- [ ] Kubernetes para orquestación

### Fase 4
- [ ] ML para detección de anomalías
- [ ] Reconocimiento facial (opcional)
- [ ] OCR para documentos
- [ ] Analytics avanzado con BigQuery

---

MIT. Copyright (c) 2026 Kids4Safe.

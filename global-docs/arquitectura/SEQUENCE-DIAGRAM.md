# Diagrama de Secuencia Kids4Safe v3.0 Enterprise

## Flujo completo: QR → Live → Ubicación tiempo real → Admin Panel

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuario (Browser)
  participant L as Live UI (/live/:qrId)
  participant B as Backend NestJS (:7000)
  participant DC as Device-Context (Py:5001)
  participant LOC as Location/Geofence (Py:5002)
  participant POL as Policy-Engine (Py:5007)
  participant SES as Session-Orchestrator (Py:5005)
  participant AUD as Audit-Log (Py:5006)
  participant REC as Recording-Orchestrator (Py:5003)
  participant CL as Cloudinary
  participant A as Admin Panel
  participant RT as Realtime Signaling (Socket.IO)

  %% ========== QR → LIVE ==========
  U->>L: Escanea QR y abre /live/:qrId
  L->>B: GET /qr/:qrId/config
  B-->>L: destinationUrl + policy + consentText

  %% ========== CONSENTIMIENTO ==========
  Note over L: Usuario lee consentimiento
  L->>B: POST /live/consent (accepted, consentVersion, permissions)
  B->>AUD: POST /audit/event CONSENT_ACCEPTED
  AUD-->>B: ok:true (silent)
  B->>SES: POST /session/create (qrId, destinationUrl)
  SES-->>B: sessionId (Redis TTL 30s)
  B-->>L: sessionId

  %% ========== DEVICE INFO ==========
  L->>B: POST /live/device-info (raw UA, timezone, language)
  B->>DC: POST /device/analyze (normalize)
  DC-->>B: deviceContext (device_type, os, browser, capabilities)
  B->>AUD: POST /audit/event DEVICE_CONTEXT_CAPTURED
  B-->>L: ok

  %% ========== UBICACIÓN TIEMPO REAL ==========
  Note over L: watchPosition activo
  loop cada 3-5 segundos
    L->>B: POST /live/location/realtime (lat, lng, accuracy, timestampMs)
    B->>LOC: POST /location/realtime (validar precisión)
    LOC-->>B: precision:exact/approx/low, confidence
    B->>SES: Actualizar sesión con ubicación
    B->>AUD: POST /audit/event LOCATION_REALTIME_UPDATE
    B->>RT: Emit a Admin Panel (WS)
    RT->>A: session:event {type:location, data:{lat,lng,precision}}
    B-->>L: ok, precision
  end

  %% ========== POLICY EVALUATION ==========
  B->>POL: POST /policy/evaluate (policy, deviceContext, geo, session)
  POL-->>B: allowContinue, requireScreen, required_permissions, reason
  B-->>L: decisions

  %% ========== WEBRTC SIGNALING ==========
  L->>RT: WS join-session (publisher)
  A->>RT: WS join-session (viewer)
  RT->>L: webrtc-create-offer(viewerSocketId)
  L->>RT: webrtc-offer
  RT->>A: offer
  A->>RT: answer + ice
  RT->>L: answer + ice
  Note over L,A: Media via WebRTC P2P (no pasa por backend)

  %% ========== HEARTBEAT ==========
  loop cada 12 segundos
    L->>B: POST /session/:id/heartbeat (stream:{camera:true,mic:true})
    B->>SES: POST /session/:id/heartbeat (renovar TTL 30s)
    SES-->>B: ok
    B-->>L: ok
  end

  %% ========== DESTINATION OPENED ==========
  L->>L: window.open(destinationUrl) (nueva pestaña)
  L->>B: POST /live/destination-opened
  B->>AUD: POST /audit/event DESTINATION_OPENED

  %% ========== RECORDING ==========
  L->>B: POST /recordings/init (sessionId, kind:screen_mic)
  B->>REC: POST /recordings/init
  REC-->>B: signature params (Cloudinary signed)
  B-->>L: signature params
  L->>CL: Upload video/webm (directo)
  CL-->>L: secureUrl
  L->>B: POST /recordings/finish (secureUrl, duration)
  B->>REC: POST /recordings/finish (metadata)
  B->>AUD: POST /audit/event RECORDING_UPLOADED
  B-->>L: ok

  %% ========== ADMIN PANEL ==========
  A->>B: GET /admin/sessions
  B->>SES: GET /sessions/active (Redis scan)
  SES-->>B: sesiones activas
  B-->>A: sesiones

  A->>B: GET /admin/audit?sessionId=...
  B->>AUD: GET /audit/search (filters)
  AUD-->>B: eventos
  B-->>A: eventos

  A->>B: POST /admin/sessions/:id/kill
  B->>SES: POST /session/:id/stop
  B->>RT: Emit signaling close
  B->>AUD: POST /audit/event ADMIN_KILLED_SESSION
  B-->>A: ok
```

## Notas Clave

1. **Frontend NUNCA llama microservicios directamente** - Todo pasa por Backend NestJS
2. **Ubicación en tiempo real** - `watchPosition` actualiza cada 3-5s con throttle
3. **Clasificación de precisión**:
   - `exact` (≤20m): GPS móvil
   - `approx` (≤200m): WiFi
   - `low` (>200m): IP only
4. **WebRTC P2P** - Media no pasa por backend, solo signaling
5. **Heartbeat 12s** - Mantiene sesión viva (Redis TTL 30s)
6. **Audit Log** - Todos los eventos son silent (webhook, nunca falla)
7. **Admin Panel** - Recibe updates en tiempo real por WebSocket

## Event Types (Audit)

- `QR_SCANNED`
- `CONSENT_ACCEPTED`
- `DEVICE_CONTEXT_CAPTURED`
- `LOCATION_REALTIME_UPDATE`
- `PERMISSION_CAMERA_GRANTED`
- `PERMISSION_MIC_GRANTED`
- `PERMISSION_SCREEN_GRANTED`
- `PERMISSION_LOCATION_GRANTED`
- `DESTINATION_OPENED`
- `RECORDING_UPLOADED`
- `SESSION_DROPPED`
- `ADMIN_VIEWER_JOINED`
- `ADMIN_KILLED_SESSION`

## Ports Reference

| Service | Port | Type |
|---------|------|------|
| Backend NestJS | 7000 | HTTP + Socket.IO |
| Device Context | 5001 | HTTP (Python) |
| Location Geofence | 5002 | HTTP (Python) |
| Recording Orchestrator | 5003 | HTTP (Python) |
| Session Orchestrator | 5005 | HTTP (Python) |
| Audit Log | 5006 | HTTP (Python) |
| Policy Engine | 5007 | HTTP (Python) |
| Frontend | 3000 | Next.js |
| Admin Panel | 3002 | Next.js |
| Redis | 6379 | Database |
| MongoDB | 27017 | Database |

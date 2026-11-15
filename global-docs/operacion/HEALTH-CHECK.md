# Health checks de Kids4Safe

## Alcance

El backend NestJS expone health checks públicos y administrativos. El antiguo
microservicio Python de streaming está deprecado: WebRTC se señaliza mediante
`/realtime` en el propio backend y no tiene un health independiente.

## Endpoints

| Endpoint | Acceso | Responsabilidad |
|---|---|---|
| `GET /health` | Público | Liveness rápido del backend para Railway |
| `GET /health/full` | JWT + `view_sessions` | Estado agregado de apps, infraestructura y micros |
| `GET /health/backend` | JWT + `view_sessions` | Proceso NestJS |
| `GET /health/redis` | JWT + `view_sessions` | Conectividad Redis |
| `GET /health/mongodb` | JWT + `view_sessions` | Conectividad Mongoose/MongoDB |
| `GET /health/microservices` | JWT + `view_sessions` | Micros Python configurados |
| `GET /health/microservices/device-info` | JWT + `view_sessions` | Device Info |
| `GET /health/microservices/location` | JWT + `view_sessions` | Location |
| `GET /health/microservices/screen-recorder` | JWT + `view_sessions` | Screen Recorder |

## Microservicios agregados

- Device Info (`5001`)
- Location (`5002`)
- Screen Recorder (`5003`)
- Session Orchestrator (`5005`)
- Audit Log (`5006`)
- Policy Engine (`5007`)
- Location Track (`5008`)
- IP Classifier (`5009`)

El puerto `5004` está retirado y no debe incluirse en despliegues nuevos.

## Estados

- `up`: respondió correctamente.
- `degraded`: respondió con un estado HTTP no exitoso.
- `down`: no respondió o agotó el timeout.
- `not-configured`: la URL no está configurada.

El endpoint `/health/full` devuelve `degraded` si una aplicación, dependencia o
microservicio configurado no está `up`.

Los servicios persistentes Device Info, Location, Audit Log y Location Track
responden HTTP `503` cuando Redis o MongoDB no están disponibles. El lanzador
local también inspecciona el JSON y rechaza `degraded`, `disconnected`, `down`,
`failed`, `not-ready` y `unhealthy`, incluso si un servicio responde HTTP 200.

## Variables del backend

```env
DEVICE_INFO_URL=http://localhost:5001
LOCATION_URL=http://localhost:5002
SCREEN_RECORDER_URL=http://localhost:5003
SESSION_ORCHESTRATOR_URL=http://localhost:5005
AUDIT_LOG_URL=http://localhost:5006
POLICY_ENGINE_URL=http://localhost:5007
LOCATION_TRACK_URL=http://localhost:5008
IP_CLASSIFIER_URL=http://localhost:5009
```

## Operación local

El arranque controlado usa `scripts/start-all.ps1`. Cada servicio debe aprobar su
health y sus dependencias antes de iniciar el siguiente. Las interfaces web, que
responden HTML, se validan por HTTP. `scripts/stop-all.ps1` detiene solamente los
PID registrados por el lanzador y verifica que sus puertos queden libres.

# 🔄 QR-Session Lifecycle

## 🧠 Concepto Fundamental

**QR ≠ Sesión**

- **QR**: Entidad permanente en la colección `qr`. Existe antes de cualquier escaneo.
- **Sesión**: Entidad temporal creada cuando un usuario **escanea y acepta** el QR.

## 📊 Diagrama de Estados

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUJO COMPLETO                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   QR existe  │────▶│ Usuario ve   │────▶│  Acepta      │
│  (colección) │     │ /s/:qrId     │     │  consent     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                   │
                                                   ▼
                                          ┌───────────────┐
                                          │ POST /session │
                                          │ /qr/:id/join  │
                                          └───────┬───────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │  Backend valida QR:         │
                                    │  • Existe?                  │
                                    │  • isActive?                │
                                    │  • expiresAt?               │
                                    │  • maxUses?                 │
                                    └──────────────┬──────────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │   Backend crea sesión:      │
                                    │   • Genera sessionId        │
                                    │   • Guarda en colección     │
                                    │   • Retorna config          │
                                    └──────────────┬──────────────┘
                                                   │
                                                   ▼
                                          ┌────────────────┐
                                          │ Frontend recibe│
                                          │   sessionId    │
                                          └────────┬───────┘
                                                   │
                                          ┌────────▼────────────────┐
                                          │ Redirect a:             │
                                          │ /s/:sessionId/live      │
                                          └────────┬────────────────┘
                                                   │
                                          ┌────────▼────────────────┐
                                          │ /live valida:           │
                                          │ GET /session/:sessionId │
                                          └────────┬────────────────┘
                                                   │
                           ┌───────────────────────┼───────────────────────┐
                           │ Existe?               │                       │
                      ┌────▼────┐                  │                ┌──────▼──────┐
                      │   NO    │                  │                │     SÍ      │
                      │ Error   │                  │                │  Continúa   │
                      │ 404     │                  │                └──────┬──────┘
                      └─────────┘                  │                       │
                                                   │              ┌────────▼────────┐
                                                   │              │ Inicia:         │
                                                   │              │ • Heartbeat     │
                                                   │              │ • WebSocket     │
                                                   │              │ • Permisos      │
                                                   │              │ • Streams       │
                                                   │              └─────────────────┘
```

## 🔑 Endpoints Críticos

### 1. **POST /session/qr/:id/join** (público)

**Propósito**: Crear sesión a partir de un QR

**Input**:
```
:id = qrId (UUID del QR)
IP del cliente (automático)
```

**Output (200)**:
```json
{
  "success": true,
  "sessionId": "uuid-session",
  "destinationUrl": "https://example.com",
  "policy": {
    "requiresCamera": true,
    "requiresLocation": true,
    "requiresScreen": false,
    "sessionTimeout": 3600,
    "allowedIPs": []
  }
}
```

**Errores**:
- `404`: QR no existe
- `403`: QR desactivado, expirado, o maxUses alcanzado

---

### 2. **GET /session/:id** (público)

**Propósito**: Obtener datos de una sesión existente

**Input**:
```
:id = sessionId (UUID de sesión)
```

**Output (200)**:
```json
{
  "sessionId": "uuid",
  "qrId": "uuid-qr",
  "status": "active",
  "permissions": {
    "camera": true,
    "location": true
  },
  "deviceInfo": {...},
  "location": {...}
}
```

**Errores**:
- `404`: Sesión no existe o expiró

---

### 3. **POST /session/:id/heartbeat** (público)

**Propósito**: Mantener sesión viva

**Solo funciona si la sesión existe**

---

## 🚫 Errores Comunes

### ❌ Error 1: Llamar a `/session/:id` antes del join

```typescript
// ❌ INCORRECTO
router.push(`/s/${qrId}/live`);  // El backend responderá 404

// ✅ CORRECTO
const { sessionId } = await fetch(`/session/qr/${qrId}/join`, { method: 'POST' });
router.push(`/s/${sessionId}/live`);
```

### ❌ Error 2: Asumir que qrId = sessionId

```typescript
// ❌ INCORRECTO
const qrId = params.id;
useWebSocket(qrId);  // El socket fallará

// ✅ CORRECTO
const { sessionId } = await joinQR(qrId);
useWebSocket(sessionId);
```

### ❌ Error 3: No validar sesión en /live

```typescript
// ❌ INCORRECTO
export default function LivePage() {
  const sessionId = useParams().sessionId;
  return <div>Transmitiendo...</div>;  // Puede no existir
}

// ✅ CORRECTO
export default function LivePage() {
  const sessionId = useParams().sessionId;
  const [state, setState] = useState('validating');
  
  useEffect(() => {
    fetch(`/session/${sessionId}`)
      .then(res => res.ok ? setState('active') : setState('invalid'))
  }, []);
  
  if (state === 'invalid') return <Error />;
  return <div>Transmitiendo...</div>;
}
```

## 🔐 Autenticación WebSocket

### Cliente Público (Usuario del QR)

```typescript
const socket = io('http://backend', {
  auth: {
    sessionId: 'uuid-session',  // NO JWT
  }
});
```

### Cliente Admin

```typescript
const socket = io('http://backend', {
  auth: {
    token: 'Bearer jwt-token',
  }
});
```

## 📝 Checklist de Implementación

### Frontend `/s/[qrId]/page.tsx` (Consent)

- [ ] Verificar QR existe (`GET /qr/:id`)
- [ ] Validar QR activo
- [ ] Validar QR no expirado
- [ ] Al aceptar consent → `POST /session/qr/:id/join`
- [ ] Guardar `sessionId` en localStorage
- [ ] Redirigir a `/s/:sessionId/live`

### Frontend `/s/[sessionId]/live/page.tsx`

- [ ] Validar sesión existe (`GET /session/:sessionId`)
- [ ] Si 404 → mostrar error y redirigir
- [ ] Si OK → iniciar heartbeat
- [ ] Si OK → conectar WebSocket con `auth: { sessionId }`
- [ ] Si OK → solicitar permisos

### Backend

- [ ] `POST /session/qr/:id/join` valida QR y crea sesión
- [ ] `GET /session/:id` verifica sesión existe
- [ ] WebSocket acepta `sessionId` en `auth` (además de JWT)
- [ ] Heartbeat solo funciona si sesión existe

## 🎯 Testing

```bash
# 1. Crear QR
curl -X POST http://localhost:7000/qr/create \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"test","destinationUrl":"https://google.com"}'

# 2. Join (crear sesión)
curl -X POST http://localhost:7000/session/qr/UUID-QR/join

# 3. Verificar sesión
curl http://localhost:7000/session/UUID-SESSION

# 4. Verificar sesiones activas
curl http://localhost:7000/session/active \
  -H "Authorization: Bearer $TOKEN"

# Debe retornar 1 sesión
```

## 🧪 Estados de Sesión

| Estado | Descripción | Puede usar heartbeat | Puede usar WebSocket |
|--------|-------------|---------------------|---------------------|
| `active` | Sesión funcionando | ✅ | ✅ |
| `paused` | Sesión pausada temporalmente | ✅ | ❌ |
| `completed` | Sesión terminada exitosamente | ❌ | ❌ |
| `expired` | Sesión expiró por timeout | ❌ | ❌ |

## 📖 Referencias

- [../api/WEBSOCKET-API.md](../api/WEBSOCKET-API.md) - Documentación completa de WebSocket
- [../componentes/backend.md](../componentes/backend.md) - Arquitectura del Backend
- [../componentes/frontend.md](../componentes/frontend.md) - Arquitectura del Frontend

# 📡 WebSocket Streaming API

## Conexión WebSocket

**URL**: `ws://localhost:7000` (Socket.io)

**Namespace**: Default (`/`)

**⚠️ Autenticación REQUERIDA**: Token JWT con permiso `view_sessions`

---

## 🔐 Autenticación

### Conectar con Token JWT

**Opción 1: En handshake auth** (Recomendado)
```javascript
import io from 'socket.io-client';

const token = sessionStorage.getItem('auth_token'); // Token del login

const socket = io('http://localhost:7000', {
  auth: {
    token: token // JWT token aquí
  }
});

// Escuchar errores de autenticación
socket.on('auth-error', (error) => {
  console.error('Error de autenticación:', error.message);
  // Redirigir a login
  window.location.href = '/login';
});
```

**Opción 2: En headers**
```javascript
const socket = io('http://localhost:7000', {
  extraHeaders: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Si no estás autenticado

❌ **La conexión se rechazará inmediatamente**:
```json
{
  "message": "Autenticación requerida. Proporciona token JWT.",
  "code": "NO_TOKEN"
}
```

### Si no tienes permisos

❌ **No podrás unirte a sesiones**:
```json
{
  "message": "No tienes permiso para ver sesiones en tiempo real"
}
```

---

## Eventos del Cliente → Servidor

### 1. `join-session`
Unirse a una sesión de streaming

**Payload**:
```json
{
  "sessionId": "qr123-session456"
}
```

**Respuesta**:
```json
{
  "ok": true,
  "sessionId": "qr123-session456",
  "message": "Conectado a la sesión"
}
```

---

### 2. `camera-stream`
Enviar frame de cámara

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Broadcast**: Emite `camera-frame` a los viewers

---

### 3. `screen-stream`
Enviar frame de pantalla

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Broadcast**: Emite `screen-frame` a los viewers

---

### 4. `audio-stream`
Enviar chunk de audio

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "chunk": "AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29..."
}
```

**Broadcast**: Emite `audio-chunk` a los viewers

---

### 5. `gps-update`
Enviar actualización de ubicación

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10,
    "altitude": 50,
    "speed": 5
  }
}
```

**Broadcast**: Emite `gps-data` a los viewers

---

### 6. `session-heartbeat`
Mantener sesión viva

**Payload**:
```json
{
  "sessionId": "qr123-session456"
}
```

**Respuesta**:
```json
{
  "ok": true,
  "timestamp": "2025-12-20T07:00:00.000Z"
}
```

---

## Eventos del Servidor → Cliente

### 1. `camera-frame`
Frame de cámara recibido

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "timestamp": "2025-12-20T07:00:00.000Z"
}
```

---

### 2. `screen-frame`
Frame de pantalla recibido

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "timestamp": "2025-12-20T07:00:00.000Z"
}
```

---

### 3. `audio-chunk`
Chunk de audio recibido

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "chunk": "AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29...",
  "timestamp": "2025-12-20T07:00:00.000Z"
}
```

---

### 4. `gps-data`
Datos de ubicación GPS

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10,
    "altitude": 50,
    "speed": 5
  },
  "timestamp": "2025-12-20T07:00:00.000Z"
}
```

---

### 5. `session-error`
Error en la sesión

**Payload**:
```json
{
  "sessionId": "qr123-session456",
  "error": "Sesión no encontrada",
  "code": "SESSION_NOT_FOUND"
}
```

---

## Ejemplo de Uso (Cliente JavaScript)

### Conectar y unirse a sesión
```javascript
import io from 'socket.io-client';

// Obtener token de sessionStorage (después de login)
const token = sessionStorage.getItem('auth_token');

// Conectar con autenticación
const socket = io('http://localhost:7000', {
  auth: {
    token: token
  }
});

// Manejar errores de autenticación
socket.on('auth-error', (error) => {
  console.error('❌ Error de auth:', error.message);
  alert('Debes iniciar sesión para ver streams');
  window.location.href = '/login';
});

// Verificar conexión exitosa
socket.on('connect', () => {
  console.log('✅ Conectado al servidor');
});

// Unirse a sesión
socket.emit('join-session', {
  sessionId: 'qr123-session456'
});

// Confirmar que te uniste
socket.on('session-joined', (data) => {
  console.log('✅ Unido a sesión:', data);
  console.log('Usuario:', data.user.username);
});

// Escuchar frames de cámara
socket.on('camera-frame', (data) => {
  const img = document.getElementById('cameraFeed');
  img.src = data.frame;
});

// Escuchar GPS
socket.on('gps-data', (data) => {
  console.log('Ubicación:', data.location);
});

// Mantener sesión viva
setInterval(() => {
  socket.emit('session-heartbeat', {
    sessionId: 'qr123-session456'
  });
}, 30000); // cada 30 segundos
```

---

## Ejemplo de Uso (Cliente Python)

```python
import socketio

sio = socketio.Client()

@sio.event
def connect():
    print('Conectado al servidor')
    sio.emit('join-session', {'sessionId': 'qr123-session456'})

@sio.on('camera-frame')
def on_camera_frame(data):
    print(f'Frame recibido: {len(data["frame"])} bytes')

sio.connect('http://localhost:7000')
sio.wait()
```

---

## Rooms (Salas)

Cada sesión se une automáticamente a una room con el ID de la sesión:
- Room name: `session-{sessionId}`
- Los viewers se unen a la misma room
- Los broadcasts se envían solo a usuarios en la misma room

---

## Desconexión

Cuando un cliente se desconecta:
1. Se pausa la sesión automáticamente
2. Se elimina del mapa de sesiones
3. Se notifica a otros usuarios en la room (opcional)

---

## Notas de Seguridad

✅ **Implementado**: 
- Autenticación JWT requerida para conectar
- Verificación de permisos (`view_sessions`)
- Solo usuarios autenticados pueden ver streams
- Tokens verificados en cada conexión
- Logs de usuarios conectados

⚠️ **Recomendaciones adicionales para producción**:
- Rate limiting por usuario (no por IP)
- Encriptación de streams (HTTPS/WSS)
- Validar sessionId existe antes de unirse
- Timeout de conexiones inactivas
- Auditoría de quién vio qué sesión

---

## Rate Limiting

- No implementado actualmente
- Recomendado para producción:
  - Max conexiones por IP: 10
  - Max eventos por segundo: 30
  - Max tamaño de frame: 5MB

---

## Monitoreo

Ver conexiones activas:
```javascript
// En el servidor
console.log('Conexiones activas:', server.sockets.sockets.size);
console.log('Sesiones activas:', sessions.size);
```

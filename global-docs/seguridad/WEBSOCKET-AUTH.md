# 🔐 Guía de Autenticación WebSocket

## Para Admin Panel (Viewers)

### 1. Usuario debe hacer login primero

```javascript
// Login en Admin Panel
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: '<contrasena-admin-segura>'
  })
});

const { token, user } = await response.json();

// Guardar token
sessionStorage.setItem('auth_token', token);
sessionStorage.setItem('user', JSON.stringify(user));
```

### 2. Conectar WebSocket con token

```javascript
// Admin-Panel/app/dashboard/page.tsx
import io from 'socket.io-client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Obtener token guardado
    const token = sessionStorage.getItem('auth_token');
    
    if (!token) {
      // Si no hay token, redirigir a login
      window.location.href = '/login';
      return;
    }

    // Conectar con token
    const newSocket = io('http://localhost:7000', {
      auth: { token }
    });

    // Eventos de conexión
    newSocket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setIsConnected(true);
    });

    newSocket.on('auth-error', (error) => {
      console.error('❌ Error de autenticación:', error);
      alert('Sesión expirada. Por favor inicia sesión nuevamente.');
      sessionStorage.clear();
      window.location.href = '/login';
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Unirse a una sesión
  const joinSession = (sessionId) => {
    if (!socket || !isConnected) {
      alert('No estás conectado al servidor');
      return;
    }

    socket.emit('join-session', { sessionId });

    socket.on('session-joined', (data) => {
      console.log('✅ Unido a sesión:', data);
      console.log('👤 Como usuario:', data.user.username);
    });

    // Escuchar streams
    socket.on('camera-frame', (data) => {
      // Mostrar video en vivo
      document.getElementById('videoFeed').src = data.frame;
    });

    socket.on('gps-data', (data) => {
      // Actualizar mapa
      updateMap(data.location);
    });
  };

  return (
    <div>
      <h1>Dashboard Admin</h1>
      {isConnected ? (
        <span className="text-green-500">🟢 Conectado</span>
      ) : (
        <span className="text-red-500">🔴 Desconectado</span>
      )}
      
      <button onClick={() => joinSession('qr123-abc456')}>
        Ver Sesión
      </button>
    </div>
  );
}
```

### 3. Verificar permisos

El backend automáticamente verifica que el usuario tenga:
- ✅ Token JWT válido
- ✅ Permiso `view_sessions`
- ✅ Usuario activo (no deshabilitado)

---

## Para Frontend (Usuario monitoreado)

El Frontend (usuario que será monitoreado) **NO necesita autenticación** para enviar sus streams, pero el Admin sí necesita estar autenticado para verlos.

```javascript
// Frontend/src/app/session/[id]/page.tsx
const socket = io('http://localhost:7000');

// Usuario NO necesita token para enviar
socket.emit('camera-stream', {
  sessionId: params.id,
  frame: cameraFrame
});
```

---

## Flujo Completo

```
1. Admin hace login → Obtiene JWT token
   POST /auth/login
   Response: { token: "eyJhbG...", user: {...} }

2. Admin guarda token
   sessionStorage.setItem('auth_token', token)

3. Admin conecta WebSocket con token
   io('ws://localhost:7000', { auth: { token } })
   
4. Backend verifica token
   - ✅ Token válido → Conexión permitida
   - ❌ Token inválido → Conexión rechazada

5. Admin se une a sesión
   socket.emit('join-session', { sessionId })
   
6. Backend verifica permisos
   - ✅ Tiene 'view_sessions' → Puede unirse
   - ❌ Sin permiso → Rechazado

7. Admin recibe streams en tiempo real
   socket.on('camera-frame', ...)
   socket.on('gps-data', ...)
```

---

## Manejo de Errores

### Token Expirado
```javascript
socket.on('auth-error', (error) => {
  if (error.message.includes('expirado')) {
    // Token expiró después de 7 días
    alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
    sessionStorage.clear();
    window.location.href = '/login';
  }
});
```

### Sin Permisos
```javascript
socket.on('auth-error', (error) => {
  if (error.message.includes('permiso')) {
    alert('No tienes permiso para ver sesiones en tiempo real.');
    // Usuario 'viewer' solo puede ver dashboard, no streams
  }
});
```

### Reconexión Automática
```javascript
const socket = io('http://localhost:7000', {
  auth: { token: sessionStorage.getItem('auth_token') },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
});

socket.on('reconnect_failed', () => {
  console.error('❌ No se pudo reconectar');
  alert('Conexión perdida. Por favor recarga la página.');
});
```

---

## Testing

### Probar sin token
```javascript
const socket = io('http://localhost:7000');
// ❌ Conexión rechazada inmediatamente
// Evento 'auth-error' emitido
```

### Probar con token inválido
```javascript
const socket = io('http://localhost:7000', {
  auth: { token: 'token-falso-123' }
});
// ❌ Evento 'auth-error': "Token inválido o expirado"
```

### Probar con usuario sin permisos
```javascript
// Login como 'viewer' (solo tiene view_qr, NO view_sessions)
const socket = io('http://localhost:7000', {
  auth: { token: viewerToken }
});

socket.emit('join-session', { sessionId: 'abc' });
// ❌ Error: "No tienes permiso para ver sesiones en tiempo real"
```

### Probar con token válido ✅
```javascript
// Login como 'admin' o 'superadmin'
const socket = io('http://localhost:7000', {
  auth: { token: adminToken }
});

socket.on('connect', () => {
  console.log('✅ Conectado!');
});

socket.emit('join-session', { sessionId: 'qr123-abc' });
// ✅ Evento 'session-joined' recibido
```

---

**Ahora solo usuarios autorizados desde el Admin Panel pueden ver los streams! 🔐**

# Integración WebSocket con Autenticación JWT - Admin Panel

## 🔐 Seguridad Implementada

El sistema ahora requiere que **solo las personas autorizadas desde el admin panel** puedan visualizar los streams en tiempo real. Los usuarios monitoreados (Frontend) pueden enviar streams sin autenticación, pero los administradores (Admin Panel) **DEBEN autenticarse** con un token JWT válido.

---

## 📋 Requisitos

### 1. **Admin Panel** (Visualizadores)
- ✅ Deben hacer login antes de conectarse al WebSocket
- ✅ Deben tener el permiso `view_sessions`
- ✅ Deben enviar el token JWT en el handshake de conexión
- ✅ El token se valida al conectar y al unirse a sesiones

### 2. **Frontend** (Usuarios Monitoreados)
- ✅ NO necesitan autenticación
- ✅ Envían streams libremente (cámara, pantalla, audio, GPS)
- ✅ No tienen acceso a visualizar otros streams

---

## 🔌 Conexión Autenticada desde Admin Panel

### Paso 1: Login y Obtener Token

```typescript
// En tu componente de Login del Admin Panel
const handleLogin = async (username: string, password: string) => {
  try {
    const response = await fetch('http://localhost:7000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    
    if (data.access_token) {
      // Guardar token en localStorage o Context
      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      
      // Redirigir al dashboard
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Credenciales inválidas');
  }
};
```

### Paso 2: Conectar WebSocket con Token

```typescript
import { io, Socket } from 'socket.io-client';

// En tu componente principal del Admin Panel o Context
const connectWebSocket = () => {
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    console.error('No hay token, redirigiendo a login');
    navigate('/login');
    return null;
  }

  // Conectar con autenticación en el handshake
  const socket = io('http://localhost:7000', {
    auth: {
      token: token, // JWT token aquí
    },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Manejar errores de autenticación
  socket.on('auth-error', (error) => {
    console.error('Auth error:', error);
    alert(`Error de autenticación: ${error.message}`);
    
    // Token inválido o expirado, cerrar sesión
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    socket.disconnect();
    navigate('/login');
  });

  // Manejar conexión exitosa
  socket.on('connect', () => {
    console.log('✅ Conectado al WebSocket con autenticación');
  });

  // Manejar desconexión
  socket.on('disconnect', (reason) => {
    console.log('Desconectado:', reason);
    
    if (reason === 'io server disconnect') {
      // El servidor desconectó al cliente (posible token inválido)
      localStorage.removeItem('admin_token');
      navigate('/login');
    }
  });

  return socket;
};
```

### Paso 3: Unirse a una Sesión

```typescript
// Cuando el admin quiere ver una sesión específica
const joinSession = (sessionId: string) => {
  if (!socket) {
    console.error('Socket no conectado');
    return;
  }

  // Emitir evento para unirse a la sesión
  socket.emit('join-session', sessionId);

  // Escuchar streams de la sesión
  socket.on('camera-frame', (data) => {
    // data = { sessionId, frame (base64), timestamp }
    displayCameraFrame(data.frame);
  });

  socket.on('screen-frame', (data) => {
    displayScreenFrame(data.frame);
  });

  socket.on('audio-chunk', (data) => {
    playAudioChunk(data.chunk);
  });

  socket.on('gps-data', (data) => {
    updateMapLocation(data.latitude, data.longitude);
  });

  socket.on('session-error', (error) => {
    console.error('Session error:', error);
    alert(`Error: ${error.message}`);
  });
};
```

---

## 🛡️ Flujo de Autenticación

```
┌─────────────────┐
│  Admin Login    │
│  (REST API)     │
└────────┬────────┘
         │
         ▼
  ┌─────────────────┐
  │ POST /auth/login│
  │ {username,pass} │
  └────────┬────────┘
           │
           ▼
    ┌─────────────┐
    │ JWT Token   │
    │ Generado    │
    └──────┬──────┘
           │
           ▼
  ┌─────────────────────┐
  │ Socket.io Connect   │
  │ auth: { token }     │
  └──────┬──────────────┘
         │
         ▼
  ┌──────────────────────┐
  │ WsJwtGuard Verifica: │
  │ ✓ Token válido       │
  │ ✓ No expirado        │
  │ ✓ Permiso correcto   │
  └──────┬───────────────┘
         │
         ├─── ❌ INVÁLIDO ──→ Emit 'auth-error' → Desconectar
         │
         ▼
  ┌─────────────────┐
  │ ✅ CONECTADO    │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────┐
  │ Admin emite:        │
  │ 'join-session'      │
  └──────┬──────────────┘
         │
         ▼
  ┌──────────────────────┐
  │ WsJwtGuard Verifica  │
  │ permiso nuevamente   │
  └──────┬───────────────┘
         │
         ├─── ❌ SIN PERMISO ──→ Emit 'session-error'
         │
         ▼
  ┌─────────────────────┐
  │ ✅ UNIDO A SESIÓN   │
  │ Recibe streams      │
  └─────────────────────┘
```

---

## 🚫 Errores Comunes y Soluciones

### 1. **Error: "No token provided"**

```
Causa: No se envió el token en el handshake
Solución: Agregar auth.token al conectar
```

```typescript
// ❌ INCORRECTO
const socket = io('http://localhost:7000');

// ✅ CORRECTO
const socket = io('http://localhost:7000', {
  auth: { token: localStorage.getItem('admin_token') }
});
```

### 2. **Error: "Invalid token"**

```
Causa: Token malformado, expirado o inválido
Solución: Hacer login nuevamente
```

```typescript
socket.on('auth-error', (error) => {
  if (error.message.includes('Invalid token') || 
      error.message.includes('jwt expired')) {
    // Limpiar localStorage y redirigir
    localStorage.clear();
    window.location.href = '/login';
  }
});
```

### 3. **Error: "Insufficient permissions"**

```
Causa: El usuario no tiene el permiso 'view_sessions'
Solución: Verificar que el rol del usuario incluya este permiso
```

```typescript
// Los usuarios deben tener estos roles:
- superadmin: ["*"] (todos los permisos)
- admin: ["view_sessions", "create_qr", "view_qr", ...]
- viewer: ["view_sessions"] (solo visualización)
```

### 4. **Socket se desconecta inmediatamente**

```
Causa: Token inválido al conectar
Solución: Verificar que el token esté guardado correctamente
```

```typescript
useEffect(() => {
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    navigate('/login');
    return;
  }
  
  const socket = connectWebSocket();
  
  return () => {
    socket?.disconnect();
  };
}, []);
```

---

## 📱 Ejemplo Completo: React Context para WebSocket

```typescript
// contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  joinSession: () => {},
  leaveSession: () => {},
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');

    if (!token) {
      navigate('/login');
      return;
    }

    // Crear conexión con autenticación
    const socketInstance = io('http://localhost:7000', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Event handlers
    socketInstance.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setConnected(false);

      if (reason === 'io server disconnect') {
        // Servidor desconectó (auth error)
        localStorage.removeItem('admin_token');
        navigate('/login');
      }
    });

    socketInstance.on('auth-error', (error) => {
      console.error('🔐 Auth error:', error);
      alert(`Error de autenticación: ${error.message}`);
      localStorage.removeItem('admin_token');
      socketInstance.disconnect();
      navigate('/login');
    });

    socketInstance.on('session-error', (error) => {
      console.error('⚠️ Session error:', error);
      alert(`Error en sesión: ${error.message}`);
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [navigate]);

  const joinSession = (sessionId: string) => {
    if (socket && connected) {
      socket.emit('join-session', sessionId);
      console.log(`📥 Uniéndose a sesión: ${sessionId}`);
    } else {
      console.error('Socket no conectado');
    }
  };

  const leaveSession = (sessionId: string) => {
    if (socket && connected) {
      socket.emit('leave-session', sessionId);
      console.log(`📤 Saliendo de sesión: ${sessionId}`);
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, connected, joinSession, leaveSession }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
```

### Uso del Context en Componentes

```typescript
// components/SessionViewer.tsx
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

interface SessionViewerProps {
  sessionId: string;
}

export const SessionViewer: React.FC<SessionViewerProps> = ({ sessionId }) => {
  const { socket, connected, joinSession, leaveSession } = useWebSocket();
  const [cameraFrame, setCameraFrame] = useState<string>('');
  const [screenFrame, setScreenFrame] = useState<string>('');
  const [gpsData, setGpsData] = useState<any>(null);

  useEffect(() => {
    if (!socket || !connected) return;

    // Unirse a la sesión
    joinSession(sessionId);

    // Escuchar eventos de stream
    socket.on('camera-frame', (data) => {
      if (data.sessionId === sessionId) {
        setCameraFrame(data.frame);
      }
    });

    socket.on('screen-frame', (data) => {
      if (data.sessionId === sessionId) {
        setScreenFrame(data.frame);
      }
    });

    socket.on('gps-data', (data) => {
      if (data.sessionId === sessionId) {
        setGpsData(data);
      }
    });

    // Cleanup
    return () => {
      leaveSession(sessionId);
      socket.off('camera-frame');
      socket.off('screen-frame');
      socket.off('gps-data');
    };
  }, [socket, connected, sessionId]);

  if (!connected) {
    return <div>Conectando al servidor...</div>;
  }

  return (
    <div className="session-viewer">
      <h2>Sesión: {sessionId}</h2>
      
      <div className="streams">
        <div className="camera-stream">
          <h3>Cámara</h3>
          {cameraFrame ? (
            <img src={`data:image/jpeg;base64,${cameraFrame}`} alt="Camera" />
          ) : (
            <p>Esperando stream de cámara...</p>
          )}
        </div>

        <div className="screen-stream">
          <h3>Pantalla</h3>
          {screenFrame ? (
            <img src={`data:image/jpeg;base64,${screenFrame}`} alt="Screen" />
          ) : (
            <p>Esperando stream de pantalla...</p>
          )}
        </div>

        <div className="gps-data">
          <h3>Ubicación GPS</h3>
          {gpsData ? (
            <div>
              <p>Lat: {gpsData.latitude}</p>
              <p>Lng: {gpsData.longitude}</p>
              <p>Precisión: {gpsData.accuracy}m</p>
            </div>
          ) : (
            <p>Esperando datos GPS...</p>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## 🧪 Testing

### 1. **Probar Login**

```bash
curl -X POST http://localhost:7000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<contrasena-admin-segura>"}'
```

Respuesta esperada:
```json
{
  "access_token": "<TOKEN>",
  "user": {
    "username": "admin",
    "role": "admin",
    "permissions": ["view_sessions", "create_qr", ...]
  }
}
```

### 2. **Probar Conexión WebSocket con Postman o Socket.io Client**

```javascript
const socket = io('http://localhost:7000', {
  auth: {
    token: '<TOKEN>' // Tu token JWT
  }
});

socket.on('connect', () => {
  console.log('✅ Conectado');
  
  // Probar unirse a una sesión
  socket.emit('join-session', 'session-123');
});

socket.on('auth-error', (error) => {
  console.error('❌ Auth error:', error);
});
```

### 3. **Probar Sin Token (Debe Fallar)**

```javascript
// Esto debería rechazarse
const socket = io('http://localhost:7000'); // Sin auth.token

socket.on('auth-error', (error) => {
  console.log('✅ Error esperado:', error.message);
  // "No token provided"
});
```

---

## 🔑 Usuarios de Prueba

Usa estos usuarios para probar el sistema:

| Usuario     | Password         | Permisos                  |
|-------------|------------------|---------------------------|
| superadmin  | <contrasena-superadmin-segura> | Todos (*)                 |
| admin       | <contrasena-admin-segura>      | view_sessions + más       |
| viewer      | <contrasena-viewer-segura>     | Solo view_sessions        |

---

## 📚 Documentación Relacionada

- [WEBSOCKET-API.md](../api/WEBSOCKET-API.md) - API completa de WebSocket
- [WEBSOCKET-AUTH.md](../seguridad/WEBSOCKET-AUTH.md) - Detalles técnicos de autenticación
- [SECURITY-AUTH.md](../seguridad/SECURITY-AUTH.md) - Sistema de autenticación REST

---

## ✅ Checklist de Implementación

- [ ] Implementar login en Admin Panel
- [ ] Guardar token JWT en localStorage/Context
- [ ] Conectar WebSocket con `auth.token` en handshake
- [ ] Manejar evento `auth-error` y redirigir a login
- [ ] Verificar reconexión automática con token guardado
- [ ] Implementar lógica de expiración de token
- [ ] Probar con diferentes roles (superadmin, admin, viewer)
- [ ] Verificar que Frontend (usuarios monitoreados) NO necesita auth
- [ ] Agregar loading states mientras conecta WebSocket
- [ ] Implementar logout que desconecta WebSocket

---

**🔐 Seguridad Garantizada:** Solo usuarios autorizados desde el Admin Panel pueden visualizar streams. Los tokens expiran en 7 días y se validan en cada conexión.

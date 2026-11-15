'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  connectionState: ConnectionState;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  sendCommand: (sessionId: string, command: string, data?: any) => void;
  activeSessions: Map<string, SessionInfo>;
}

interface SessionInfo {
  sessionId: string;
  qrId: string;
  deviceInfo?: any;
  permissions?: any;
  lastHeartbeat?: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  connectionState: 'disconnected',
  joinSession: () => {},
  leaveSession: () => {},
  sendCommand: () => {},
  activeSessions: new Map(),
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [activeSessions, setActiveSessions] = useState<Map<string, SessionInfo>>(new Map());
  const router = useRouter();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const sessionExpirationCheckRef = useRef<NodeJS.Timeout>();

  const checkExpiredSessions = useCallback(() => {
    const now = Date.now();
    const TTL_THRESHOLD = 35000; // 35s sin heartbeat = expirada
    
    setActiveSessions(prev => {
      const updated = new Map(prev);
      let hasExpired = false;
      
      prev.forEach((session, sessionId) => {
        if (session.lastHeartbeat && (now - session.lastHeartbeat) > TTL_THRESHOLD) {
          console.log(`⏰ Sesión expirada: ${sessionId} (sin heartbeat por ${Math.floor((now - session.lastHeartbeat) / 1000)}s)`);
          updated.delete(sessionId);
          hasExpired = true;
        }
      });
      
      return hasExpired ? updated : prev;
    });
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');

    if (!token) {
      console.log('⚠️ No hay token, no se puede conectar al WebSocket');
      return;
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!BACKEND_URL) {
      console.error('❌ NEXT_PUBLIC_BACKEND_URL no configurado - WebSocket no puede iniciar');
      alert('Error de configuración: NEXT_PUBLIC_BACKEND_URL faltante');
      return;
    }

    // Crear conexión con autenticación JWT y retry con backoff exponencial
    console.log('🔌 Conectando al WebSocket con autenticación...');
    const socketInstance = io(BACKEND_URL, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      randomizationFactor: 0.5, // Jitter para evitar thundering herd
    });

    // ============ Event Handlers ============

    socketInstance.on('connect', () => {
      console.log('✅ WebSocket conectado con autenticación JWT');
      setConnected(true);
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Iniciar check de sesiones expiradas cada 10s
      sessionExpirationCheckRef.current = setInterval(checkExpiredSessions, 10000);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reintentando conexión (intento ${attemptNumber})...`);
      setConnectionState('reconnecting');
      reconnectAttemptsRef.current = attemptNumber;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setConnected(false);
      setConnectionState('disconnected');
      
      if (sessionExpirationCheckRef.current) {
        clearInterval(sessionExpirationCheckRef.current);
      }

      if (reason === 'io server disconnect') {
        // El servidor desconectó al cliente (posible auth error)
        console.error('🔐 Servidor desconectó - Token inválido o expirado');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('admin_authenticated');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          router.push('/login');
        }, 1000);
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      setConnected(false);
    });

    // Auth error específico
    socketInstance.on('auth-error', (error) => {
      console.error('🔐 Error de autenticación:', error);
      alert(`Error de autenticación: ${error.message || 'Token inválido'}`);
      
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('admin_authenticated');
      socketInstance.disconnect();
      
      router.push('/login');
    });

    // Session error
    socketInstance.on('session-error', (error) => {
      console.error('⚠️ Error de sesión:', error);
      alert(`Error: ${error.message || 'Error en la sesión'}`);
    });

    // Session joined confirmation
    socketInstance.on('session-joined', (data: { sessionId: string; message: string }) => {
      console.log('📥 Unido a sesión:', data.sessionId);
    });

    // Session left confirmation
    socketInstance.on('session-left', (data: { sessionId: string; message: string }) => {
      console.log('📤 Salió de sesión:', data.sessionId);
      setActiveSessions(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.sessionId);
        return newMap;
      });
    });

    // Active sessions list (cuando el admin se conecta)
    socketInstance.on('active-sessions-list', (sessions: any[]) => {
      console.log('📋 Sesiones activas recibidas:', sessions.length);
      const newMap = new Map<string, SessionInfo>();
      sessions.forEach(session => {
        newMap.set(session.sessionId, session);
      });
      setActiveSessions(newMap);
    });

    // Session started notification
    socketInstance.on('session-started', (data: SessionInfo) => {
      console.log('🆕 Nueva sesión iniciada:', data.sessionId);
      setActiveSessions(prev => {
        const newMap = new Map(prev);
        newMap.set(data.sessionId, data);
        return newMap;
      });
    });

    // Session ended notification
    socketInstance.on('session-ended', (data: { sessionId: string }) => {
      console.log('🛑 Sesión terminada:', data.sessionId);
      setActiveSessions(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.sessionId);
        return newMap;
      });
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      console.log('🔌 Desconectando WebSocket...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (sessionExpirationCheckRef.current) {
        clearInterval(sessionExpirationCheckRef.current);
      }
      socketInstance.disconnect();
    };
  }, [router, checkExpiredSessions]);

  const joinSession = (sessionId: string) => {
    if (socket && connected) {
      console.log(`📥 Intentando unirse a sesión: ${sessionId}`);
      socket.emit('join-session', sessionId);
    } else {
      console.error('❌ Socket no conectado, no se puede unir a la sesión');
      alert('WebSocket no conectado. Recargando página...');
      window.location.reload();
    }
  };

  const leaveSession = (sessionId: string) => {
    if (socket && connected) {
      console.log(`📤 Saliendo de sesión: ${sessionId}`);
      socket.emit('leave-session', sessionId);
    }
  };

  const sendCommand = (sessionId: string, command: string, data?: any) => {
    if (socket && connected) {
      console.log(`📡 Enviando comando "${command}" a sesión ${sessionId}`);
      socket.emit('admin-command', {
        sessionId,
        command,
        data,
      });
    } else {
      console.error('❌ Socket no conectado, no se puede enviar comando');
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        connectionState,
        joinSession,
        leaveSession,
        sendCommand,
        activeSessions,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket debe usarse dentro de WebSocketProvider');
  }
  return context;
};

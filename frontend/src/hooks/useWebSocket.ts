import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getPublisherSessionToken } from '@/lib/publisher-auth';

export function useWebSocket(sessionId: string | null, enabled = true) {
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    // ⛔ Prevenir reconexión si ya existe
    if (socketRef.current?.connected) {
      console.log('♻️ [useWebSocket] Socket ya conectado, reutilizando');
      return;
    }

    const publisherToken = getPublisherSessionToken(sessionId);
    if (!publisherToken) return;

    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000', {
      transports: ['websocket', 'polling'],
      auth: {
        sessionId,
        publisherToken,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket conectado');
      socket.emit('join-session', { sessionId, role: 'client' });
    });

    socket.on('command', (data: { command: string; payload?: any }) => {
      console.log('Comando recibido del admin:', data);
      // Aquí puedes manejar comandos del admin
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ [useWebSocket] Desconectado:', reason);
      // No hacer nada - dejar que reconecte automáticamente
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 [useWebSocket] Reconectado después de ${attemptNumber} intentos`);
    });

    socketRef.current = socket;
    setSocketState(socket);

    return () => {
      console.log('🧹 [useWebSocket] Cleanup ejecutado');
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
        setSocketState(null);
      }
    };
  }, [sessionId, enabled]);

  return socketState;
}

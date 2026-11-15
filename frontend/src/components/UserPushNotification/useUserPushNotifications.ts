import { useEffect, useState } from 'react';
import type { PushNotificationData } from './types';

type UseUserPushNotificationsOptions = {
  sessionId: string;
  publisherToken?: string | null;
};

export function useUserPushNotifications({
  sessionId,
  publisherToken,
}: UseUserPushNotificationsOptions) {
  const [notification, setNotification] = useState<PushNotificationData | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!sessionId || !publisherToken) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
    let socket: any = null;

    const markAsSeen = async (notificationId: string) => {
      try {
        await fetch(`${backendUrl}/notifications/push/${notificationId}/seen/${sessionId}`, {
          method: 'PATCH',
          headers: { 'X-Publisher-Session-Token': publisherToken },
        });
      } catch (error) {
        console.error('Error marking notification as seen:', error);
      }
    };

    import('socket.io-client').then(({ io }) => {
      socket = io(`${backendUrl}/realtime`, {
        auth: { publisherToken, sessionId },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socket.on('connect', () => {
        console.log('✅ [UserPush] Conectado al servidor de notificaciones');
        socket.emit('join-session', { sessionId, role: 'subscriber' });
      });

      socket.on('user-push-notification', (data: PushNotificationData) => {
        console.log('📬 [UserPush] Notificación recibida:', data);
        setNotification(data);
        setShow(true);
        void markAsSeen(data.id);
      });

      socket.on('error', (error: any) => {
        console.error('❌ [UserPush] Error WebSocket:', error);
      });
    }).catch((error) => {
      console.error('Error loading socket.io-client:', error);
    });

    return () => {
      socket?.disconnect();
    };
  }, [sessionId, publisherToken]);

  const closeNotification = () => {
    setShow(false);
    setTimeout(() => setNotification(null), 300);
  };

  return {
    notification,
    show,
    closeNotification,
  };
}

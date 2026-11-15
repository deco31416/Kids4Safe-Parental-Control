'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { AlertTriangle, ChevronDown, Clock3, Volume2, VolumeX, X } from 'lucide-react';
import { emergencyDisplayMessage } from '@/lib/session-presentation';
import { EmergencyAlarm } from '@/lib/emergency-alarm';
import { SESSION_ENDED_EVENT } from '@/lib/emergency-alert-events';

type EmergencyNotification = {
  id: string;
  type: string;
  message: string;
  sessionId?: string;
  isRead?: boolean;
  createdAt?: string;
};

const STORAGE_KEY = 'acknowledged_mobile_emergency_alerts';
const CHANNEL_NAME = 'kids4safe-emergency-alerts';

function readAcknowledgedIds(): Set<string> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function MobileEmergencyAlert() {
  const [alert, setAlert] = useState<EmergencyNotification | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const alertRef = useRef<EmergencyNotification | null>(null);
  const alarmRef = useRef<EmergencyAlarm | null>(null);
  const acknowledgedRef = useRef(new Set<string>());
  const channelRef = useRef<BroadcastChannel | null>(null);

  const acknowledge = (broadcast = true) => {
    const current = alertRef.current;
    // Clear the alert first: in-flight playback and gesture callbacks must see it dismissed.
    alertRef.current = null;
    alarmRef.current?.stop();
    setAlert(null);
    setSoundBlocked(false);
    if (!current) return;
    acknowledgedRef.current.add(current.id);
    if (current.sessionId) acknowledgedRef.current.add('session:' + current.sessionId);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(acknowledgedRef.current).slice(-200)));
    } catch { /* Silencing must work even when browser storage is unavailable. */ }
    if (broadcast) channelRef.current?.postMessage({ id: current.id, sessionId: current.sessionId });
    const token = sessionStorage.getItem('auth_token');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (broadcast && token && backendUrl) {
      void fetch(backendUrl + '/notifications/admin/' + encodeURIComponent(current.id) + '/read', {
        method: 'PATCH', headers: { Authorization: 'Bearer ' + token },
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!token || !backendUrl) return;
    let disposed = false;
    acknowledgedRef.current = readAcknowledgedIds();
    const alarm = new EmergencyAlarm((blocked) => {
      if (!disposed) setSoundBlocked(blocked);
    });
    alarmRef.current = alarm;
    const abort = new AbortController();
    const sessionEnded = (sessionId?: string) => {
      if (sessionId && alertRef.current?.sessionId === sessionId) acknowledge();
    };
    const triggerAlert = (notification: EmergencyNotification) => {
      if (disposed) return;
      if (notification.type === 'session_ended') {
        sessionEnded(notification.sessionId);
        return;
      }
      if (notification.type !== 'mobile_emergency_started' || !notification.id || notification.isRead) return;
      if (acknowledgedRef.current.has(notification.id) || acknowledgedRef.current.has('session:' + notification.sessionId)) return;
      if (alertRef.current?.id === notification.id) return;
      alertRef.current = notification;
      setAlert(notification);
      setSoundBlocked(false);
      alarm.start();
    };
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = ({ data }) => {
        if (!data || typeof data.id !== 'string') return;
        acknowledgedRef.current.add(data.id);
        if (typeof data.sessionId === 'string') acknowledgedRef.current.add('session:' + data.sessionId);
        const current = alertRef.current;
        if (current && (current.id === data.id || (data.sessionId && current.sessionId === data.sessionId))) acknowledge(false);
      };
    }
    const socket = io(backendUrl + '/realtime', {
      auth: { token, role: 'viewer' }, transports: ['websocket', 'polling'],
    });
    socket.on('admin-notification', triggerAlert);
    socket.on('session-ended', ({ sessionId }: { sessionId?: string }) => sessionEnded(sessionId));
    let syncing = false;
    const syncPendingAlerts = async () => {
      if (disposed || syncing) return;
      syncing = true;
      try {
        const response = await fetch(backendUrl + '/notifications/admin?limit=50&unreadOnly=true', {
          headers: { Authorization: 'Bearer ' + token }, signal: abort.signal,
        });
        const data = response.ok ? await response.json() : null;
        if (disposed) return;
        const pending = data?.notifications?.find((item: EmergencyNotification) =>
          item.type === 'mobile_emergency_started' && !item.isRead && !acknowledgedRef.current.has(item.id) && !acknowledgedRef.current.has('session:' + item.sessionId));
        if (pending) triggerAlert(pending);
      } catch { /* Retry after reconnect or on the next poll. */ }
      finally { syncing = false; }
    };
    socket.on('connect', syncPendingAlerts);
    void syncPendingAlerts();
    const syncTimer = setInterval(() => void syncPendingAlerts(), 5000);
    const retry = () => { if (alertRef.current) alarm.retry(); };
    const onSessionEnded = (event: Event) => sessionEnded((event as CustomEvent<{ sessionId: string }>).detail?.sessionId);
    window.addEventListener('pointerdown', retry);
    window.addEventListener('keydown', retry);
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded);
    return () => {
      disposed = true;
      alertRef.current = null;
      abort.abort();
      clearInterval(syncTimer);
      alarm.stop();
      alarmRef.current = null;
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
      window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded);
      channelRef.current?.close();
      channelRef.current = null;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const sessionId = alert?.sessionId;
    const token = sessionStorage.getItem('auth_token');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!sessionId || !token || !backendUrl) return;
    let disposed = false;
    let checking = false;
    const abort = new AbortController();
    // A notification can remain unread after the mobile user has already ended the emergency.
    // Check authoritative session state instead of treating every unread notification as active.
    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(backendUrl + '/session/' + encodeURIComponent(sessionId), {
          headers: { Authorization: 'Bearer ' + token }, signal: abort.signal,
        });
        const session = response.ok ? await response.json() : null;
        if (!disposed && alertRef.current?.sessionId === sessionId &&
          (response.status === 404 || session?.status === 'completed' || session?.status === 'ended')) {
          acknowledge();
        }
      } catch { /* Network failures must not silently dismiss an active emergency. */ }
      finally { checking = false; }
    };
    void checkSession();
    const timer = setInterval(() => void checkSession(), 5000);
    return () => { disposed = true; abort.abort(); clearInterval(timer); };
  }, [alert?.id, alert?.sessionId]);

  if (!alert) return null;
  const createdAt = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Ahora';
  return (
    <aside role="alert" className="kids-emergency-notice">
      <div className="kids-emergency-heading">
        <span className="kids-emergency-icon" aria-hidden="true"><AlertTriangle /></span>
        <div className="min-w-0">
          <p className="kids-emergency-eyebrow">Kids4Safe · Emergencias</p>
          <h2>Auxilio activo</h2>
        </div>
        <button type="button" onClick={() => acknowledge()} aria-label="Cerrar y silenciar alarma" className="kids-emergency-close"><X /></button>
      </div>
      <p className="kids-emergency-message">{emergencyDisplayMessage(alert.message)}</p>
      <p className="kids-emergency-time"><Clock3 aria-hidden="true" />{createdAt}</p>
      <div className="kids-emergency-actions">
        <div className="kids-emergency-sound">
          <span className="kids-emergency-indicator" aria-hidden="true" />
          <span>{soundBlocked ? 'El sonido necesita tu autorización' : 'La alarma está sonando'}</span>
        </div>
        <button type="button" onClick={() => acknowledge()} className="kids-emergency-silence">
          <span className="kids-emergency-action-icon" aria-hidden="true"><VolumeX /></span>
          <span>Silenciar alarma</span>
        </button>
        {soundBlocked && <button type="button" onClick={() => alarmRef.current?.retry()} className="kids-emergency-enable"><Volume2 aria-hidden="true" />Activar sonido</button>}
      </div>
      <details className="kids-emergency-details">
        <summary><span>Información del auxilio</span><ChevronDown aria-hidden="true" /></summary>
        <div className="kids-emergency-details-body"><p>{alert.message}</p><p className="font-mono">{alert.sessionId ? 'Sesión ' + alert.sessionId : 'Sesión no disponible'}</p></div>
      </details>
    </aside>
  );
}

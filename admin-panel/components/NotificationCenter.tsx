'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, MapPin, Video, Camera, Power, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeAdminNotifications, type AdminNotification } from '@/lib/admin-notification';

const NOTIFICATION_ICONS = {
  qr_scanned: Video,
  session_started: Power,
  permission_granted: Check,
  session_ended: X,
  location_updated: MapPin,
  device_info_received: Camera,
  mobile_emergency_started: AlertTriangle,
};

const NOTIFICATION_COLORS = {
  qr_scanned: 'text-blue-500',
  session_started: 'text-green-500',
  permission_granted: 'text-primary',
  session_ended: 'text-red-500',
  location_updated: 'text-yellow-500',
  device_info_received: 'text-cyan-500',
  mobile_emergency_started: 'text-red-400',
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notificaciones al abrir
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications/admin?limit=20&unreadOnly=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(normalizeAdminNotifications(data.notifications));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch contador de no leídas
  const fetchUnreadCount = async () => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications/admin/unread-count`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Marcar notificación como leída
  const markAsRead = async (notificationId: string) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications/admin/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const token = sessionStorage.getItem('auth_token');
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications/admin/read-all`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Polling para actualizar contador
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Cada 30s
    return () => clearInterval(interval);
  }, []);

  // Fetch al abrir
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
    return `Hace ${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <div className="relative min-w-0">
      {/* Botón campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="kids-pill-control relative inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted p-2 transition-colors hover:bg-muted sm:w-11"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 shrink-0 text-foreground opacity-80" />
        <span className="text-sm font-medium sm:hidden">Avisos</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div
          className="fixed left-3 right-3 top-24 z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-lg border border-border bg-card text-foreground shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <h3 className="font-semibold text-lg text-foreground">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={cn(
                    'text-xs',
                    'text-blue-400',
                    'hover:text-blue-700',
                    'font-medium',
                    'flex',
                    'items-center',
                    'gap-1'
                  )}
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar notificaciones"
                className="text-foreground opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-foreground opacity-60">
                Cargando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-foreground opacity-60">
                <Bell className="w-12 h-12 mx-auto mb-3 text-foreground opacity-30" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                const colorClass = NOTIFICATION_COLORS[notification.type] || 'text-foreground opacity-60';

                return (
                  <div
                    key={notification.id}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                    className={`p-4 border-b border-border hover:bg-muted hover:bg-opacity-60 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-500 bg-opacity-10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-normal'} text-foreground`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-foreground opacity-50">
                            {timeAgo(notification.createdAt)}
                          </span>
                          {notification.sessionId && (
                            <span className="text-xs text-blue-400 font-mono">
                              #{notification.sessionId.substring(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <button className={cn('text-sm', 'text-blue-400', 'hover:text-blue-700', 'font-medium')}>
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay para cerrar al hacer clic fuera */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

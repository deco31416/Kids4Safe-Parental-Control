export type AdminNotification = {
  id: string;
  type: 'qr_scanned' | 'session_started' | 'permission_granted' | 'session_ended' | 'location_updated' | 'device_info_received' | 'mobile_emergency_started';
  message: string;
  sessionId?: string;
  qrId?: string;
  isRead: boolean;
  createdAt: string;
};

const TYPES = new Set<AdminNotification['type']>([
  'qr_scanned',
  'session_started',
  'permission_granted',
  'session_ended',
  'location_updated',
  'device_info_received',
  'mobile_emergency_started',
]);

export function normalizeAdminNotifications(payload: unknown): AdminNotification[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    const id = raw.id ?? raw._id;
    const type = raw.type ?? raw.adminType;
    const message = raw.message ?? raw.adminMessage;

    if (!id || typeof type !== 'string' || !TYPES.has(type as AdminNotification['type'])) return [];
    if (typeof message !== 'string' || typeof raw.createdAt !== 'string') return [];

    return [{
      id: String(id),
      type: type as AdminNotification['type'],
      message,
      sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : undefined,
      qrId: typeof raw.qrId === 'string' ? raw.qrId : undefined,
      isRead: Boolean(raw.isRead),
      createdAt: raw.createdAt,
    }];
  });
}

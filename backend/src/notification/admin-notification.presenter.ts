export type AdminNotificationSource = {
  _id?: unknown;
  id?: unknown;
  adminType?: unknown;
  type?: unknown;
  adminMessage?: unknown;
  message?: unknown;
  sessionId?: unknown;
  qrId?: unknown;
  isRead?: unknown;
  createdAt?: unknown;
};

export function serializeAdminNotification(source: AdminNotificationSource) {
  return {
    id: String(source.id ?? source._id ?? ''),
    type: source.type ?? source.adminType,
    message: source.message ?? source.adminMessage,
    sessionId: source.sessionId,
    qrId: source.qrId,
    isRead: Boolean(source.isRead),
    createdAt: source.createdAt,
  };
}

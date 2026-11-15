import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  AdminNotificationType,
  UserPushNotificationType,
  PushContent,
  ReactivateTarget,
} from './notification.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Session, SessionDocument } from '../session/session.schema';
import { MobileUnitService } from '../mobile/mobile-unit.service';
import { WebPushService } from './web-push/web-push.service';
import { serializeAdminNotification } from './admin-notification.presenter';
import { StorageUrlService } from '../storage/storage-url.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    private mobileUnitService: MobileUnitService,
    private realtimeGateway: RealtimeGateway,
    private webPushService: WebPushService,
    private readonly mediaUrls: StorageUrlService,
  ) {}

  // ========== NOTIFICACIONES ADMINISTRATIVAS ==========

  /**
   * Crear notificación administrativa (para el centro de notificaciones del Admin-Panel)
   */
  async createAdminNotification(
    adminType: AdminNotificationType,
    adminMessage: string,
    sessionId?: string,
    qrId?: string,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.create({
      notificationCategory: 'admin',
      adminType,
      adminMessage,
      sessionId,
      qrId,
      isRead: false,
    });

    this.logger.log(`✉️ Notificación admin creada: ${adminType} - ${adminMessage}`);

    // Emitir a todos los admins conectados vía WebSocket
    this.realtimeGateway.server.to(RealtimeGateway.ADMIN_NOTIFICATIONS_ROOM).emit(
      'admin-notification',
      serializeAdminNotification(notification),
    );

    return notification;
  }

  /**
   * Obtener notificaciones administrativas (con paginación)
   */
  async getAdminNotifications(
    page: number = 1,
    limit: number = 50,
    unreadOnly: boolean = false,
  ) {
    const query = { notificationCategory: 'admin' };
    if (unreadOnly) {
      query['isRead'] = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      notifications: notifications.map(serializeAdminNotification),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marcar notificación admin como leída
   */
  async markAdminNotificationAsRead(notificationId: string) {
    const notification = await this.notificationModel.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true },
    );

    if (notification) {
      this.logger.log(`✅ Notificación admin marcada como leída: ${notificationId}`);
    }

    return notification;
  }

  /**
   * Marcar TODAS las notificaciones admin como leídas
   */
  async markAllAdminNotificationsAsRead() {
    const result = await this.notificationModel.updateMany(
      { notificationCategory: 'admin', isRead: false },
      { isRead: true, readAt: new Date() },
    );

    this.logger.log(`✅ ${result.modifiedCount} notificaciones admin marcadas como leídas`);
    return { markedAsRead: result.modifiedCount };
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  async getUnreadCount() {
    const count = await this.notificationModel.countDocuments({
      notificationCategory: 'admin',
      isRead: false,
    });

    return { unreadCount: count };
  }

  // ========== NOTIFICACIONES PUSH A USUARIOS FINALES ==========

  /**
   * Enviar notificación push a usuarios específicos
   */
  async sendPushNotification(
    pushType: UserPushNotificationType | string,
    pushContent: PushContent,
    targetSessions: string[],
    reactivateTunnel: boolean = false,
    reactivateTargets: ReactivateTarget[] = [],
    expiresInSeconds: number = 900,
    createdBy?: string,
  ): Promise<NotificationDocument> {
    const targetSessionIds = Array.from(new Set(targetSessions.filter(Boolean)));
    const normalizedReactivateTargets = this.normalizeReactivateTargets(
      reactivateTargets,
      reactivateTunnel,
    );
    const requestKind = normalizedReactivateTargets.length > 0 ? 'service_reactivation' : 'message';
    const boundedExpirySeconds = Math.min(Math.max(expiresInSeconds || 900, 60), 86400);
    const expiresAt = requestKind === 'service_reactivation'
      ? new Date(Date.now() + boundedExpirySeconds * 1000)
      : undefined;
    const notification = await this.notificationModel.create({
      notificationCategory: 'user_push',
      pushType,
      pushContent,
      targetSessions: targetSessionIds,
      reactivateTunnel: normalizedReactivateTargets.length > 0,
      reactivateTargets: normalizedReactivateTargets,
      requestKind,
      requiresConfirmation: requestKind === 'service_reactivation',
      expiresAt,
      responses: [],
      createdBy,
      deliveredTo: [],
      seenBy: [],
    });

    this.logger.log(
      `📢 Notificación push creada: ${pushType} → ${targetSessionIds.length} sesiones`,
    );

    const mobilePushTargets = await this.getMobilePushTargets(targetSessionIds);

    // Enviar a cada sesión vía WebSocket y PUSH nativo si hay token Expo.
    for (const sessionId of targetSessionIds) {
      let delivered = false;
      try {
        const socketRecipients = await this.realtimeGateway.server.in(sessionId).fetchSockets();
        if (socketRecipients.length > 0) {
          this.realtimeGateway.server.to(sessionId).emit('user-push-notification', {
            id: notification._id,
            type: pushType,
            content: pushContent,
            reactivateTunnel: normalizedReactivateTargets.length > 0,
            reactivateTargets: normalizedReactivateTargets,
            requestId: String(notification._id),
            requestKind,
            requiresConfirmation: requestKind === 'service_reactivation',
            expiresAt: expiresAt?.toISOString(),
            sessionId,
            timestamp: notification.createdAt,
          });
          delivered = true;
          this.logger.log(`Socket push enviado a ${sessionId} (${socketRecipients.length} cliente/s)`);
        } else {
          this.logger.warn(`Socket push omitido para ${sessionId}: sala sin clientes`);
        }
      } catch (error) {
        this.logger.warn(`Socket push fallo para ${sessionId}: ${error.message}`);
      }

      const pushToken = mobilePushTargets.get(sessionId);
      if (pushToken) {
        try {
          await this.sendExpoPush(pushToken, pushType, pushContent, {
            notificationId: String(notification._id),
            sessionId,
            reactivateTunnel: normalizedReactivateTargets.length > 0,
            reactivateTargets: normalizedReactivateTargets,
            requestId: String(notification._id),
            requestKind,
            requiresConfirmation: requestKind === 'service_reactivation',
            expiresAt: expiresAt?.toISOString(),
          });
          delivered = true;
        } catch (error) {
          this.logger.warn(`Expo Push fallo para ${sessionId}: ${error.message}`);
        }
      }

      try {
        const webPushResult = await this.webPushService.sendToSession(sessionId, {
          id: String(notification._id),
          type: String(pushType),
          title: pushContent.title || 'Kids4Safe',
          body: pushContent.body || pushContent.linkText,
          linkUrl: pushContent.linkUrl,
          imageUrl: pushContent.imageUrl,
          pdfUrl: pushContent.pdfUrl,
          reactivateTunnel: normalizedReactivateTargets.length > 0,
          reactivateTargets: normalizedReactivateTargets,
          requestId: String(notification._id),
          requestKind,
          requiresConfirmation: requestKind === 'service_reactivation',
          expiresAt: expiresAt?.toISOString(),
          sessionId,
        });
        if (webPushResult.sent > 0) delivered = true;
        if (webPushResult.skipped) {
          this.logger.warn(`Web Push omitido para ${sessionId}: ${webPushResult.reason}`);
        } else {
          this.logger.log(`Web Push resultado para ${sessionId}: ${webPushResult.sent} enviado/s`);
        }
      } catch (error) {
        this.logger.warn(`Web Push fallo para ${sessionId}: ${error.message}`);
      }

      try {
        if (!delivered) {
          this.logger.warn(`Push sin canal confirmado para sesión ${sessionId}`);
          continue;
        }
        await this.notificationModel.findByIdAndUpdate(notification._id, {
          $addToSet: { deliveredTo: sessionId },
        });
        this.logger.log(`📨 Push enviado a sesión ${sessionId}`);
      } catch (error) {
        this.logger.error(`❌ Error registrando entrega push a ${sessionId}: ${error.message}`);
      }
    }

    return notification;
  }

  /**
   * Enviar push a TODAS las sesiones activas (broadcast)
   */
  async broadcastPushNotification(
    pushType: UserPushNotificationType | string,
    pushContent: PushContent,
    reactivateTunnel: boolean = false,
    reactivateTargets: ReactivateTarget[] = [],
    expiresInSeconds: number = 900,
    createdBy?: string,
  ) {
    this.logger.log(`📡 Broadcast push a todas las sesiones activas`);

    const sessions = await this.sessionModel
      .find({ status: 'active' })
      .select('sessionId')
      .lean()
      .exec();
    const installedMobileTargets = await this.mobileUnitService.getPushTargetSessionIds();
    const activeSessions = Array.from(
      new Set([
        ...sessions.map((session) => session.sessionId).filter(Boolean),
        ...installedMobileTargets,
      ]),
    );

    if (activeSessions.length === 0) {
      this.logger.warn('⚠️ No hay sesiones activas para broadcast');
      return null;
    }

    return this.sendPushNotification(
      pushType,
      pushContent,
      activeSessions,
      reactivateTunnel,
      reactivateTargets,
      expiresInSeconds,
      createdBy,
    );
  }

  private async getMobilePushTargets(sessionIds: string[]): Promise<Map<string, string>> {
    const sessions = await this.sessionModel
      .find({
        sessionId: { $in: sessionIds },
        source: 'mobile-app',
      })
      .select('sessionId mobile.unitId mobile.notificationToken')
      .lean()
      .exec();

    const targets: Array<[string, string]> = [];
    for (const session of sessions as any[]) {
      const token =
        (await this.mobileUnitService.getNotificationToken(session.mobile?.unitId)) ||
        session.mobile?.notificationToken?.token;
      if (session.sessionId && this.isExpoPushToken(token)) {
        targets.push([session.sessionId, token]);
      }
    }

    return new Map(targets);
  }

  private isExpoPushToken(token: unknown): token is string {
    return (
      typeof token === 'string' &&
      /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)
    );
  }

  private async sendExpoPush(
    token: string,
    pushType: UserPushNotificationType | string,
    pushContent: PushContent,
    data: Record<string, unknown>,
  ) {
    const message = {
      to: token,
      sound: 'default',
      title: pushContent.title || 'Kids4Safe',
      body: pushContent.body || pushContent.linkText || 'Nueva alerta de seguridad',
      data: {
        type: pushType,
        ...data,
        imageUrl: pushContent.imageUrl,
        pdfUrl: pushContent.pdfUrl,
        linkUrl: pushContent.linkUrl,
        actionButtons: pushContent.actionButtons,
      },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const payload = (await response.json().catch(() => null)) as {
      data?: { status?: string; message?: string; details?: { error?: string } } | Array<{ status?: string; message?: string; details?: { error?: string } }>;
    } | null;
    if (!response.ok) {
      throw new Error(`Expo Push HTTP ${response.status}: ${JSON.stringify(payload)}`);
    }

    const ticket = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
    if (ticket?.status === 'error') {
      throw new Error(`Expo Push error: ${ticket.message || ticket.details?.error || 'unknown'}`);
    }

    return ticket;
  }

  /**
   * Marcar notificación push como vista por un usuario
   */
  async markPushAsSeen(notificationId: string, sessionId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, targetSessions: sessionId },
      { $addToSet: { seenBy: sessionId } },
      { new: true },
    );

    if (notification) {
      this.logger.log(`👁️ Push ${notificationId} visto por sesión ${sessionId}`);
    }

    return notification;
  }

  async respondToPush(
    notificationId: string,
    sessionId: string,
    decision: 'accepted' | 'rejected',
    targets: ReactivateTarget[] = [],
  ) {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      targetSessions: sessionId,
      requestKind: 'service_reactivation',
    });
    if (!notification) return null;
    if (notification.expiresAt && notification.expiresAt.getTime() <= Date.now()) {
      return { expired: true, notification };
    }

    const allowedTargets = this.normalizeReactivateTargets(
      notification.reactivateTargets || [],
      Boolean(notification.reactivateTunnel),
    );
    const acceptedTargets = decision === 'accepted'
      ? targets.filter((target) => allowedTargets.includes(target))
      : [];
    notification.responses = (notification.responses || []).filter(
      (response) => response.sessionId !== sessionId,
    );
    notification.responses.push({
      decision,
      respondedAt: new Date(),
      sessionId,
      targets: acceptedTargets,
    });
    if (!notification.seenBy.includes(sessionId)) notification.seenBy.push(sessionId);
    await notification.save();
    return { expired: false, notification };
  }

  async getPendingPushForSession(sessionId: string, since?: Date, limit = 10) {
    const query: Record<string, any> = {
      notificationCategory: 'user_push',
      targetSessions: sessionId,
      seenBy: { $ne: sessionId },
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    };

    if (since) {
      query.createdAt = { $gt: since };
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: 1 })
      .limit(Math.min(Math.max(limit, 1), 25))
      .lean()
      .exec();

    return notifications.map((notification) => ({
      id: String(notification._id),
      type: notification.pushType,
      content: this.refreshPushMedia(notification.pushContent),
      reactivateTunnel: Boolean(notification.reactivateTunnel),
      reactivateTargets: this.normalizeReactivateTargets(
        notification.reactivateTargets || [],
        Boolean(notification.reactivateTunnel),
      ),
      requestId: String(notification._id),
      requestKind: notification.requestKind || 'message',
      requiresConfirmation: Boolean(notification.requiresConfirmation),
      expiresAt: notification.expiresAt,
      timestamp: notification.createdAt,
    }));
  }

  private normalizeReactivateTargets(
    reactivateTargets: unknown,
    reactivateTunnel: boolean,
  ): ReactivateTarget[] {
    const allowed = new Set<ReactivateTarget>(['camera', 'microphone', 'screen', 'location']);
    const targets = Array.isArray(reactivateTargets)
      ? reactivateTargets.filter((target): target is ReactivateTarget => allowed.has(target))
      : [];

    if (targets.length > 0) {
      return Array.from(new Set(targets));
    }

    return reactivateTunnel ? ['camera', 'microphone'] : [];
  }

  private refreshPushMedia(content?: PushContent) {
    if (!content) return {};
    return {
      ...content,
      ...(content.imageUrl ? { imageUrl: this.mediaUrls.refresh(content.imageUrl) } : {}),
      ...(content.pdfUrl ? { pdfUrl: this.mediaUrls.refresh(content.pdfUrl) } : {}),
      ...(content.actionButtons ? { actionButtons: content.actionButtons.map((button) => ({ ...button, ...(button.url ? { url: this.mediaUrls.refresh(button.url) } : {}) })) } : {}),
    };
  }

  /**
   * Obtener historial de notificaciones push enviadas
   */
  async getPushHistory(page: number = 1, limit: number = 50) {
    const query = { notificationCategory: 'user_push' };
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ========== HELPERS PARA TRIGGERS AUTOMÁTICOS ==========

  /**
   * Trigger: QR escaneado
   */
  async notifyQrScanned(qrId: string, sessionId: string) {
    return this.createAdminNotification(
      AdminNotificationType.QR_SCANNED,
      `QR ${qrId} escaneado - Sesión ${sessionId.substring(0, 8)}...`,
      sessionId,
      qrId,
    );
  }

  /**
   * Trigger: Nueva sesión iniciada
   */
  async notifySessionStarted(sessionId: string, qrId: string) {
    return this.createAdminNotification(
      AdminNotificationType.SESSION_STARTED,
      `Nueva sesión iniciada: ${sessionId.substring(0, 8)}... (QR: ${qrId})`,
      sessionId,
      qrId,
    );
  }

  /**
   * Trigger: Permiso otorgado
   */
  async notifyPermissionGranted(sessionId: string, permissionType: string) {
    return this.createAdminNotification(
      AdminNotificationType.PERMISSION_GRANTED,
      `Usuario otorgó permiso: ${permissionType} (Sesión: ${sessionId.substring(0, 8)}...)`,
      sessionId,
    );
  }

  /**
   * Trigger: Sesión terminada
   */
  async notifySessionEnded(sessionId: string) {
    return this.createAdminNotification(
      AdminNotificationType.SESSION_ENDED,
      `Sesión terminada: ${sessionId.substring(0, 8)}...`,
      sessionId,
    );
  }

  /**
   * Trigger: Ubicación actualizada
   */
  async notifyLocationUpdated(sessionId: string, location: string) {
    return this.createAdminNotification(
      AdminNotificationType.LOCATION_UPDATED,
      `Ubicación actualizada: ${location} (Sesión: ${sessionId.substring(0, 8)}...)`,
      sessionId,
    );
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

/**
 * TIPO 1: Notificaciones Administrativas
 * Se muestran en el centro de notificaciones del Admin-Panel
 */
export enum AdminNotificationType {
  QR_SCANNED = 'qr_scanned',
  SESSION_STARTED = 'session_started',
  PERMISSION_GRANTED = 'permission_granted',
  SESSION_ENDED = 'session_ended',
  LOCATION_UPDATED = 'location_updated',
  DEVICE_INFO_RECEIVED = 'device_info_received',
  MOBILE_EMERGENCY_STARTED = 'mobile_emergency_started',
}

/**
 * TIPO 2: Notificaciones Push a Usuarios Finales
 * Marketing, promociones, contenido enviado por el admin
 */
export enum UserPushNotificationType {
  TEXT = 'text',
  IMAGE = 'image',
  PDF = 'pdf',
  LINK = 'link',
  PROMOTION = 'promotion',
  ALERT = 'alert',
}

export type ReactivateTarget = 'camera' | 'microphone' | 'screen' | 'location';
export type PushResponseDecision = 'accepted' | 'rejected';

/**
 * Contenido de la notificación push (flexible)
 */
export interface PushContent {
  title?: string;
  body?: string;
  imageUrl?: string;
  pdfUrl?: string;
  linkUrl?: string;
  linkText?: string;
  customData?: Record<string, any>;
  actionButtons?: {
    label: string;
    action: 'open_link' | 'download_pdf' | 'activate_camera' | 'close';
    url?: string;
  }[];
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, enum: ['admin', 'user_push'] })
  notificationCategory: 'admin' | 'user_push';

  // ========== PARA NOTIFICACIONES ADMINISTRATIVAS ==========
  @Prop({
    type: String,
    enum: Object.values(AdminNotificationType),
    required: function() {
      return this.notificationCategory === 'admin';
    },
  })
  adminType?: AdminNotificationType;

  @Prop({ type: String })
  adminMessage?: string; // Ej: "Usuario escaneó QR #123", "Nueva sesión iniciada"

  @Prop({ type: String })
  sessionId?: string; // Referencia a la sesión que generó la notificación

  @Prop({ type: String })
  qrId?: string; // Referencia al QR involucrado

  // ========== PARA NOTIFICACIONES PUSH A USUARIOS ==========
  @Prop({
    type: String,
    enum: Object.values(UserPushNotificationType),
    required: function() {
      return this.notificationCategory === 'user_push';
    },
  })
  pushType?: UserPushNotificationType;

  @Prop({ type: Object })
  pushContent?: PushContent; // Contenido flexible (texto, imágenes, PDFs, links)

  @Prop({ type: [String], default: [] })
  targetSessions: string[]; // IDs de sesiones que recibirán la notificación

  @Prop({ type: Boolean, default: false })
  reactivateTunnel?: boolean; // Si true, reactiva acceso a cámara/micrófono al recibir

  @Prop({ type: [String], default: [] })
  reactivateTargets?: ReactivateTarget[];

  @Prop({ type: String, enum: ['message', 'service_reactivation'], default: 'message' })
  requestKind?: 'message' | 'service_reactivation';

  @Prop({ type: Boolean, default: false })
  requiresConfirmation?: boolean;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: [Object], default: [] })
  responses?: Array<{
    sessionId: string;
    decision: PushResponseDecision;
    targets: ReactivateTarget[];
    respondedAt: Date;
  }>;

  // ========== CAMPOS COMUNES ==========
  @Prop({ type: Boolean, default: false })
  isRead: boolean; // Para notificaciones admin

  @Prop({ type: [String], default: [] })
  deliveredTo: string[]; // sessionIds que recibieron la notificación push

  @Prop({ type: [String], default: [] })
  seenBy: string[]; // sessionIds que vieron la notificación push

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  readAt?: Date; // Cuando el admin marcó como leída

  @Prop({ type: String })
  createdBy?: string; // ID del admin que envió la notificación push
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Índices para búsqueda rápida
NotificationSchema.index({ notificationCategory: 1, createdAt: -1 });
NotificationSchema.index({ sessionId: 1 });
NotificationSchema.index({ targetSessions: 1 });
NotificationSchema.index({ isRead: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 });

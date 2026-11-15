import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * 📋 Audit Log Schema (Gobierno/KYC)
 * 
 * Registra TODOS los eventos importantes del sistema para:
 * - Compliance legal
 * - Auditorías gubernamentales
 * - Trazabilidad completa
 * - Investigaciones
 */

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  eventType: string; // QR_CREATED, SESSION_JOINED, CONSENT_ACCEPTED, etc.

  @Prop({ required: true })
  actorType: 'user' | 'admin' | 'system';

  @Prop()
  actorId?: string; // userId (si es admin) o sessionId (si es user)

  @Prop()
  actorUsername?: string;

  @Prop()
  qrId?: string;

  @Prop()
  sessionId?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Datos adicionales (JSON flexible)

  @Prop({ type: Object })
  eventDetails?: Record<string, any>; // Detalles del evento para PDF

  @Prop()
  hash?: string; // Hash del evento para integridad

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  geo?: {
    latitude?: number;
    longitude?: number;
    country?: string;
    city?: string;
  };

  @Prop()
  consentVersion?: string; // Versión del texto legal que el usuario aceptó

  @Prop()
  severity?: 'info' | 'warning' | 'critical'; // Para filtros rápidos
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Índices para queries rápidas (MUY IMPORTANTE en producción)
AuditLogSchema.index({ eventType: 1, timestamp: -1 });
AuditLogSchema.index({ sessionId: 1, timestamp: -1 });
AuditLogSchema.index({ qrId: 1, timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 }); // Para listados cronológicos

// P1 #7: TTL 90 días para audit logs (compliance: right to be forgotten)
AuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 86400, name: 'audit_logs_ttl' }
);

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit.schema';

export interface CreateAuditLogDto {
  eventType: string;
  actorType: 'user' | 'admin' | 'system';
  actorId?: string;
  actorUsername?: string;
  qrId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  geo?: {
    latitude?: number;
    longitude?: number;
    country?: string;
    city?: string;
  };
  consentVersion?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface AuditLogFilters {
  qrId?: string;
  sessionId?: string;
  eventType?: string;
  actorType?: 'user' | 'admin' | 'system';
  actorId?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  severity?: 'info' | 'warning' | 'critical';
  limit?: number;
  skip?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Crear log de auditoría
   * Nunca falla (try/catch interno) para no romper flujo principal
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditLogModel.create({
        ...dto,
        timestamp: new Date(),
      });
    } catch (error) {
      // Log silencioso (no romper el flujo principal)
      console.error('❌ [Audit] Error al crear log:', error.message);
    }
  }

  /**
   * Buscar logs con filtros
   */
  async find(filters: AuditLogFilters = {}) {
    const query: any = {};

    if (filters.qrId) query.qrId = filters.qrId;
    if (filters.sessionId) query.sessionId = filters.sessionId;
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.actorType) query.actorType = filters.actorType;
    if (filters.actorId) query.actorId = filters.actorId;
    if (filters.severity) query.severity = filters.severity;

    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) query.timestamp.$gte = new Date(filters.from);
      if (filters.to) query.timestamp.$lte = new Date(filters.to);
    }

    const limit = Math.min(filters.limit || 100, 500); // Max 500
    const skip = filters.skip || 0;

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);

    return {
      logs,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
    };
  }

  /**
   * Obtener logs de una sesión específica (timeline completo)
   */
  async getSessionTimeline(sessionId: string) {
    return this.auditLogModel
      .find({ sessionId })
      .sort({ timestamp: 1 }) // Cronológico ascendente
      .lean()
      .exec();
  }

  /**
   * Obtener logs de un QR (todas sus sesiones)
   */
  async getQRLogs(qrId: string, limit = 50) {
    return this.auditLogModel
      .find({ qrId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Stats rápidos para dashboard
   */
  async getStats(filters: { from?: string; to?: string } = {}) {
    const query: any = {};

    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) query.timestamp.$gte = new Date(filters.from);
      if (filters.to) query.timestamp.$lte = new Date(filters.to);
    }

    const [
      total,
      byEventType,
      byActorType,
      bySeverity,
      criticalEvents,
    ] = await Promise.all([
      this.auditLogModel.countDocuments(query),
      
      this.auditLogModel.aggregate([
        { $match: query },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      this.auditLogModel.aggregate([
        { $match: query },
        { $group: { _id: '$actorType', count: { $sum: 1 } } },
      ]),

      this.auditLogModel.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),

      this.auditLogModel
        .find({ ...query, severity: 'critical' })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);

    return {
      total,
      byEventType,
      byActorType,
      bySeverity,
      criticalEvents,
    };
  }
}

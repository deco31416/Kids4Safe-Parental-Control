import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Session } from './session.schema';

/**
 * Service para detectar correlación entre sesiones (fraud detection)
 * 
 * Detecta si un mismo usuario (device fingerprint) usa múltiples QRs
 * en una ventana de 24 horas → Posible fraude KYC
 */
@Injectable()
export class SessionCorrelationService {
  private readonly logger = new Logger(SessionCorrelationService.name);

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  /**
   * Genera device fingerprint SHA-256
   * 
   * Hash de:
   * - userAgent
   * - screenResolution (width x height)
   * - timezone offset
   * - language
   * - platform
   * - hardwareConcurrency
   * 
   * @param deviceInfo - Device info del cliente
   * @returns SHA-256 hash (64 chars hex)
   */
  generateDeviceFingerprint(deviceInfo: any): string {
    try {
      // Extraer datos para fingerprint
      const userAgent = deviceInfo?.userAgent || 'unknown';
      const screenResolution = deviceInfo?.screenResolution
        ? `${deviceInfo.screenResolution.width}x${deviceInfo.screenResolution.height}`
        : 'unknown';
      const timezone = deviceInfo?.timezone || 'unknown';
      const language = deviceInfo?.language || 'unknown';
      const platform = deviceInfo?.platform || 'unknown';
      const hardwareConcurrency = deviceInfo?.hardwareConcurrency || 0;

      // Concatenar todos los datos
      const fingerprintData = [
        userAgent,
        screenResolution,
        timezone,
        language,
        platform,
        hardwareConcurrency,
      ].join('|');

      // Generar SHA-256 hash
      const hash = crypto
        .createHash('sha256')
        .update(fingerprintData)
        .digest('hex');

      this.logger.debug(`Device fingerprint generado: ${hash.substring(0, 16)}...`);
      return hash;

    } catch (error) {
      this.logger.error(`Error generando device fingerprint: ${error.message}`);
      // Fallback: hash del userAgent solo
      return crypto
        .createHash('sha256')
        .update(deviceInfo?.userAgent || 'unknown')
        .digest('hex');
    }
  }

  /**
   * Busca sesiones correlacionadas (mismo fingerprint en últimas 24h)
   * 
   * @param deviceFingerprint - Fingerprint a buscar
   * @param currentSessionId - Session ID actual (excluir)
   * @returns Array de sesiones correlacionadas
   */
  async findCorrelatedSessions(
    deviceFingerprint: string,
    currentSessionId: string,
  ): Promise<Session[]> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Query: mismo fingerprint + últimas 24h + excluir sesión actual
      const correlatedSessions = await this.sessionModel
        .find({
          deviceFingerprint,
          sessionId: { $ne: currentSessionId }, // Excluir sesión actual
          createdAt: { $gte: twentyFourHoursAgo }, // Últimas 24h
        })
        .select('sessionId qrId status createdAt location.city location.country')
        .sort({ createdAt: -1 })
        .limit(20) // Máximo 20 sesiones correlacionadas
        .exec();

      this.logger.log(
        `Encontradas ${correlatedSessions.length} sesiones correlacionadas para fingerprint ${deviceFingerprint.substring(0, 16)}...`
      );

      return correlatedSessions;

    } catch (error) {
      this.logger.error(`Error buscando sesiones correlacionadas: ${error.message}`);
      return [];
    }
  }

  /**
   * Evalúa el riesgo de correlación
   * 
   * Niveles:
   * - low: 2 sesiones (normal)
   * - medium: 3-4 sesiones (sospechoso)
   * - high: 5-7 sesiones (alto riesgo)
   * - critical: 8+ sesiones (fraude confirmado)
   * 
   * @param correlationCount - Número de sesiones correlacionadas
   * @returns Risk level
   */
  evaluateCorrelationRisk(correlationCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (correlationCount >= 8) return 'critical';
    if (correlationCount >= 5) return 'high';
    if (correlationCount >= 3) return 'medium';
    return 'low';
  }

  /**
   * Calcula score adicional por correlación (para SessionRiskBadge)
   * 
   * Score adicional:
   * - 2 sesiones: +10
   * - 3-4 sesiones: +30
   * - 5-7 sesiones: +50
   * - 8+ sesiones: +100 (CRITICAL automático)
   * 
   * @param correlationCount - Número de sesiones correlacionadas
   * @returns Score adicional (0-100)
   */
  calculateCorrelationScore(correlationCount: number): number {
    if (correlationCount >= 8) return 100; // CRITICAL
    if (correlationCount >= 5) return 50;  // HIGH
    if (correlationCount >= 3) return 30;  // MEDIUM
    if (correlationCount === 2) return 10; // LOW
    return 0; // Sin correlación
  }

  /**
   * Actualiza flags de correlación en la sesión
   * 
   * @param sessionId - Session ID a actualizar
   * @param correlatedSessions - Sesiones correlacionadas encontradas
   */
  async updateCorrelationFlags(
    sessionId: string,
    correlatedSessions: Session[],
  ): Promise<void> {
    try {
      const correlationCount = correlatedSessions.length;
      const correlationRisk = this.evaluateCorrelationRisk(correlationCount);

      await this.sessionModel.updateOne(
        { sessionId },
        {
          $set: {
            correlatedSessionIds: correlatedSessions.map(s => s.sessionId),
            correlationFlags: {
              isCorrelated: correlationCount > 0,
              correlationCount,
              correlationRisk,
              firstDetectedAt: correlationCount > 0 ? new Date() : undefined,
              lastCheckedAt: new Date(),
            },
          },
        }
      );

      this.logger.log(
        `Flags de correlación actualizados para sesión ${sessionId}: ${correlationCount} sesiones, riesgo ${correlationRisk}`
      );

    } catch (error) {
      this.logger.error(`Error actualizando flags de correlación: ${error.message}`);
    }
  }

  /**
   * Proceso completo: genera fingerprint + busca correlaciones + actualiza flags
   * 
   * @param sessionId - Session ID actual
   * @param deviceInfo - Device info del cliente
   * @returns Correlation data
   */
  async processSessionCorrelation(sessionId: string, deviceInfo: any): Promise<{
    deviceFingerprint: string;
    correlatedSessions: Session[];
    correlationCount: number;
    correlationRisk: 'low' | 'medium' | 'high' | 'critical';
    correlationScore: number;
  }> {
    try {
      // 1. Generar device fingerprint
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);

      // 2. Actualizar sesión con fingerprint
      await this.sessionModel.updateOne(
        { sessionId },
        { $set: { deviceFingerprint } }
      );

      // 3. Buscar sesiones correlacionadas
      const correlatedSessions = await this.findCorrelatedSessions(
        deviceFingerprint,
        sessionId,
      );

      const correlationCount = correlatedSessions.length;
      const correlationRisk = this.evaluateCorrelationRisk(correlationCount);
      const correlationScore = this.calculateCorrelationScore(correlationCount);

      // 4. Actualizar flags de correlación
      await this.updateCorrelationFlags(sessionId, correlatedSessions);

      // 5. Log si se detectó riesgo medio/alto/crítico
      if (correlationRisk === 'critical') {
        this.logger.warn(
          `🚨 CORRELACIÓN CRÍTICA: Sesión ${sessionId} tiene ${correlationCount} sesiones correlacionadas (fraude confirmado)`
        );
      } else if (correlationRisk === 'high') {
        this.logger.warn(
          `⚠️ CORRELACIÓN ALTA: Sesión ${sessionId} tiene ${correlationCount} sesiones correlacionadas (alto riesgo)`
        );
      } else if (correlationRisk === 'medium') {
        this.logger.log(
          `⚡ CORRELACIÓN MEDIA: Sesión ${sessionId} tiene ${correlationCount} sesiones correlacionadas (sospechoso)`
        );
      }

      return {
        deviceFingerprint,
        correlatedSessions,
        correlationCount,
        correlationRisk,
        correlationScore,
      };

    } catch (error) {
      this.logger.error(`Error procesando correlación de sesión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene sesiones correlacionadas de una sesión (para Admin Panel)
   * 
   * @param sessionId - Session ID
   * @returns Correlation data
   */
  async getSessionCorrelation(sessionId: string): Promise<{
    correlatedSessions: Session[];
    correlationFlags?: any;
  }> {
    try {
      const session = await this.sessionModel.findOne({ sessionId }).exec();
      if (!session) {
        return { correlatedSessions: [], correlationFlags: null };
      }

      if (!session.deviceFingerprint || !session.correlatedSessionIds?.length) {
        return { correlatedSessions: [], correlationFlags: session.correlationFlags };
      }

      // Fetch full session data de sesiones correlacionadas
      const correlatedSessions = await this.sessionModel
        .find({ sessionId: { $in: session.correlatedSessionIds } })
        .select('sessionId qrId status createdAt location deviceInfo')
        .sort({ createdAt: -1 })
        .exec();

      return {
        correlatedSessions,
        correlationFlags: session.correlationFlags,
      };

    } catch (error) {
      this.logger.error(`Error obteniendo correlación: ${error.message}`);
      return { correlatedSessions: [], correlationFlags: null };
    }
  }
}

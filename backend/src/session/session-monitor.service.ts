import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './session.schema';
import { OrchestratorClient } from './orchestrator.client';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Servicio de monitoreo de sesiones expiradas
 * 
 * Detecta sesiones que expiraron en orchestrator (sin heartbeat 30s)
 * y actualiza su estado en MongoDB a 'dropped'
 */
@Injectable()
export class SessionMonitorService implements OnModuleInit {
  private readonly logger = new Logger(SessionMonitorService.name);

  private isOrchestratorEnabled: boolean = false;

  constructor(
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    private orchestrator: OrchestratorClient,
  ) {}

  async onModuleInit() {
    // Verificar si Orchestrator está habilitado
    const health = await this.orchestrator.healthCheck();
    this.isOrchestratorEnabled = health.healthy;
    
    if (!this.isOrchestratorEnabled) {
      this.logger.warn('🏠 [SessionMonitor] Orchestrator en modo LOCAL - monitor DESACTIVADO');
      this.logger.warn('🏠 [SessionMonitor] Sesiones se gestionan directamente en MongoDB + Redis');
    } else {
      this.logger.log('✅ SessionMonitorService inicializado con Orchestrator ACTIVO');
    }
  }

  /**
   * Ejecuta cada 30s para detectar sesiones dropped
   * 
   * 🔒 SOLO ACTIVO cuando Orchestrator está en modo PLUGIN
   * En modo LOCAL, este cron NO hace nada (MongoDB es fuente única de verdad)
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async detectExpiredSessions() {
    // 🔒 FIX CRÍTICO: No ejecutar en modo LOCAL
    if (!this.isOrchestratorEnabled) {
      this.logger.debug('⏭️ [SessionMonitor] Skipped (Orchestrator en modo LOCAL)');
      return;
    }

    try {
      // 1. Obtener sesiones activas/paused en MongoDB
      const mongoSessions = await this.sessionModel.find({
        status: { $in: ['active', 'paused'] },
      }).select('sessionId status').lean().exec();

      if (mongoSessions.length === 0) {
        return; // No hay sesiones activas
      }

      // 2. Obtener sesiones activas en orchestrator (Redis microservicio)
      const orchestratorSessions = await this.orchestrator.getActiveSessions();
      const activeInRedis = new Set(orchestratorSessions.map(s => s.session_id));

      // 3. Detectar sesiones que están en MongoDB pero NO en Redis → expiradas
      const expiredSessions = mongoSessions.filter(
        session => !activeInRedis.has(session.sessionId)
      );

      if (expiredSessions.length === 0) {
        return; // Todas las sesiones están sincronizadas
      }

      // 4. Actualizar sesiones expiradas en MongoDB
      const updates = expiredSessions.map(async session => {
        const updated = await this.sessionModel.findOneAndUpdate(
          { sessionId: session.sessionId, status: { $in: ['active', 'paused'] } },
          {
            $set: {
              status: 'dropped',
              endReason: 'expired_no_heartbeat',
              lastSeen: new Date(),
            },
          },
          { new: true }
        );

        if (updated) {
          this.logger.warn(`⏱️ [SessionMonitor] Session expirada (sin heartbeat): ${session.sessionId}`);
        }
      });

      await Promise.all(updates);

      this.logger.log(`🔍 [SessionMonitor] Procesadas ${mongoSessions.length} sesiones, ${expiredSessions.length} expiradas`);
    } catch (error) {
      this.logger.error(`❌ [SessionMonitor] Error detectando sesiones expiradas: ${error.message}`);
    }
  }

  /**
   * Verifica estado de una sesión específica en orchestrator
   * 
   * @returns true si sesión está activa en Redis, false si expiró
   */
  async checkSessionAlive(sessionId: string): Promise<boolean> {
    const session = await this.orchestrator.getSession(sessionId);
    return session !== null && session.status === 'active';
  }

  /**
   * Sincroniza sesión específica desde orchestrator a MongoDB
   * 
   * Útil para forzar actualización después de eventos WebRTC
   */
  async syncSessionFromOrchestrator(sessionId: string): Promise<void> {
    try {
      const orchestratorSession = await this.orchestrator.getSession(sessionId);
      
      if (!orchestratorSession) {
        // Sesión no existe en Redis → marcar como dropped
        await this.sessionModel.findOneAndUpdate(
          { sessionId, status: { $in: ['active', 'paused'] } },
          {
            $set: {
              status: 'dropped',
              endReason: 'expired_no_heartbeat',
              lastSeen: new Date(),
            },
          }
        );
        this.logger.warn(`⏱️ [SessionMonitor] Sesión marcada como dropped (no en Redis): ${sessionId}`);
        return;
      }

      // Sesión existe → actualizar campos
      await this.sessionModel.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            status: orchestratorSession.status,
            lastSeen: new Date(orchestratorSession.last_seen_at),
            streams: orchestratorSession.stream,
            location: orchestratorSession.location,
          },
        }
      );

      this.logger.debug(`🔄 [SessionMonitor] Sesión sincronizada desde orchestrator: ${sessionId}`);
    } catch (error) {
      this.logger.error(`❌ [SessionMonitor] Error sincronizando sesión ${sessionId}: ${error.message}`);
    }
  }
}

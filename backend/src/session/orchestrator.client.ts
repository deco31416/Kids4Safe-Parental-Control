import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PluginModeService } from '../config/plugin-mode.service';

interface CreateSessionPayload {
  session_id: string;
  qr_id: string;
  destination_url: string;
}

interface HeartbeatPayload {
  stream?: {
    camera?: boolean;
    microphone?: boolean;
    screen?: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

interface OrchestratorSession {
  session_id: string;
  qr_id: string;
  destination_url: string;
  status: 'active' | 'paused' | 'stopped' | 'dropped';
  created_at: number;
  last_seen_at: number;
  stream?: {
    camera?: boolean;
    microphone?: boolean;
    screen?: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  network?: {
    ip?: string;
    user_agent?: string;
  };
}

/**
 * Cliente HTTP para microservicio session-orchestrator
 * 
 * 🔌 FASE 1: Modo Plugin Controlado
 * - Si USE_SESSION_ORCHESTRATOR=false → no hace nada (MongoDB directo)
 * - Si USE_SESSION_ORCHESTRATOR=true → usa Redis TTL con heartbeat
 * 
 * Maneja TTL en Redis (30s) con heartbeat cada 10s
 * Timeout 2s para no bloquear el flujo principal
 */
@Injectable()
export class OrchestratorClient {
  private readonly logger = new Logger(OrchestratorClient.name);
  private readonly client: AxiosInstance;
  private readonly pluginEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private pluginMode: PluginModeService,
  ) {
    const baseURL =
      this.configService.get<string>('SESSION_ORCHESTRATOR_URL') ||
      this.configService.get<string>('SESSION_ORCHESTRATOR_SERVICE_URL') ||
      this.configService.get<string>('ORCHESTRATOR_URL', 'http://localhost:5005');
    const apiKey = this.configService.get<string>('ADMIN_API_KEY', '');

    // 🔌 FASE 1: Flag centralizado
    this.pluginEnabled = this.pluginMode.isSessionOrchestratorEnabled();

    this.client = axios.create({
      baseURL,
      timeout: 2000, // 2s timeout - no bloquear el flujo
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!this.pluginEnabled) {
      this.logger.log('🏠 SessionOrchestrator en modo LOCAL - usando Redis/MongoDB directo');
    } else {
      this.logger.log(`🔌 SessionOrchestrator en modo PLUGIN → ${baseURL}`);
    }
  }

  /**
   * Crea sesión en Redis con TTL 30s
   * 
   * @returns sessionId + TTL si éxito, null si timeout/error
   */
  async createSession(payload: CreateSessionPayload): Promise<{ session_id: string; ttl_seconds: number } | null> {
    if (!this.pluginEnabled) return null;

    try {
      const { data } = await this.client.post('/session/create', payload);
      this.logger.log(`✅ [Orchestrator] Session creada: ${payload.session_id} (TTL ${data.ttl_seconds}s)`);
      return data;
    } catch (error) {
      this.logger.error(`❌ [Orchestrator] Error creando sesión: ${error.message}`);
      return null;
    }
  }

  /**
   * Heartbeat - renueva TTL y actualiza estado
   * 
   * Cliente debe llamar cada 10s para mantener sesión viva
   */
  async heartbeat(sessionId: string, payload?: HeartbeatPayload): Promise<boolean> {
    if (!this.pluginEnabled) return false;

    try {
      await this.client.post(`/session/${sessionId}/heartbeat`, payload || {});
      this.logger.debug(`💓 [Orchestrator] Heartbeat: ${sessionId}`);
      return true;
    } catch (error) {
      // No loggear como error porque puede ser sesión expirada (esperado)
      this.logger.debug(`⏱️ [Orchestrator] Heartbeat falló: ${sessionId} - ${error.message}`);
      return false;
    }
  }

  /**
   * Detiene sesión (marca como stopped, mantiene en Redis con TTL)
   */
  async stopSession(sessionId: string): Promise<boolean> {
    if (!this.pluginEnabled) return false;

    try {
      await this.client.post(`/session/${sessionId}/stop`);
      this.logger.log(`⏹️ [Orchestrator] Session detenida: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.warn(`❌ [Orchestrator] Error deteniendo sesión: ${error.message}`);
      return false;
    }
  }

  /**
   * Pausa sesión (marca como paused, mantiene en Redis con TTL)
   */
  async pauseSession(sessionId: string): Promise<boolean> {
    if (!this.pluginEnabled) return false;

    try {
      await this.client.post(`/session/${sessionId}/pause`);
      this.logger.log(`⏸️ [Orchestrator] Session pausada: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.warn(`❌ [Orchestrator] Error pausando sesión: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene metadata de sesión desde Redis
   * 
   * @returns null si no existe o expiró
   */
  async getSession(sessionId: string): Promise<OrchestratorSession | null> {
    if (!this.pluginEnabled) return null;

    try {
      const { data } = await this.client.get(`/session/${sessionId}`);
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.debug(`🔍 [Orchestrator] Session no encontrada: ${sessionId}`);
      } else {
        this.logger.warn(`❌ [Orchestrator] Error obteniendo sesión: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Lista sesiones activas en Redis
   * 
   * 🔒 IMPORTANTE: En modo LOCAL retorna [] y loggea warning
   * El SessionMonitor NO debe usar esto en modo LOCAL
   */
  async getActiveSessions(): Promise<OrchestratorSession[]> {
    if (!this.pluginEnabled) {
      this.logger.debug('🏠 [OrchestratorClient] LOCAL mode → getActiveSessions() skipped (retornando [])');
      return [];
    }

    try {
      const { data } = await this.client.get('/sessions/active');
      return data.sessions || [];
    } catch (error) {
      this.logger.error(`❌ [Orchestrator] Error listando sesiones: ${error.message}`);
      return [];
    }
  }

  /**
   * Verifica salud del microservicio
   */
  async healthCheck(): Promise<{ healthy: boolean; redis: boolean }> {
    if (!this.pluginEnabled) return { healthy: false, redis: false };

    try {
      const { data } = await this.client.get('/health');
      return {
        healthy: data.status === 'healthy',
        redis: data.redis === 'connected',
      };
    } catch (error) {
      return { healthy: false, redis: false };
    }
  }
}

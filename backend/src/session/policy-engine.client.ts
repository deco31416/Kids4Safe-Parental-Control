import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PluginModeService } from '../config/plugin-mode.service';

export interface PolicyDecision {
  allow_camera: boolean;
  allow_mic: boolean;
  allow_screen: boolean;
  require_screen: boolean;
  allow_location: boolean;
  allow_continue: boolean;
  required_permissions: string[];
  reason: string;
}

export interface DeviceContext {
  device_type?: string;
  os?: string;
  browser?: string;
  ip?: string;
  user_agent?: string;
  capabilities?: {
    camera?: boolean;
    microphone?: boolean;
    screenShare?: boolean;
    gps?: boolean;
  };
}

export interface QRPolicy {
  policyType?: 'STANDARD' | 'KYC_STRICT' | 'SCREEN_ONLY' | 'ONE_TIME' | 'LOCATION_REQUIRED';
  permissionsRequired?: string[];
  ttlSeconds?: number;
  maxUses?: number;
  geofence?: {
    lat: number;
    lng: number;
    radiusMeters: number;
  };
}

export interface EvaluatePolicyPayload {
  qr_policy: QRPolicy;
  device_context?: DeviceContext;
  session_state?: any;
  geo?: {
    lat?: number;
    lng?: number;
    isInsideFence?: boolean;
  };
}

/**
 * Cliente HTTP para microservicio policy-engine
 * 
 * 🔌 FASE 1: Modo Plugin Controlado
 * - Si USE_POLICY_ENGINE=false → siempre retorna null (lógica local)
 * - Si USE_POLICY_ENGINE=true → intenta microservicio con fallback
 * 
 * Evalúa policies basadas en tipo QR, device capabilities, geofence
 * Timeout 2s - usa fallback local si falla
 */
@Injectable()
export class PolicyEngineClient {
  private readonly logger = new Logger(PolicyEngineClient.name);
  private readonly client: AxiosInstance;
  private readonly pluginEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private pluginMode: PluginModeService,
  ) {
    const baseURL =
      this.configService.get<string>('POLICY_ENGINE_SERVICE_URL') ||
      this.configService.get<string>('POLICY_ENGINE_URL', 'http://localhost:5007');
    const apiKey = this.configService.get<string>('ADMIN_API_KEY', '');

    // 🔌 FASE 1: Flag centralizado
    this.pluginEnabled = this.pluginMode.isPolicyEngineEnabled();

    this.client = axios.create({
      baseURL,
      timeout: 2000, // 2s timeout - fallback local si falla
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!this.pluginEnabled) {
      this.logger.log('🏠 PolicyEngine en modo LOCAL - usando lógica interna');
    } else {
      this.logger.log(`🔌 PolicyEngine en modo PLUGIN → ${baseURL}`);
    }
  }

  /**
   * Evalúa policy y retorna decisión
   * 
   * 🔌 FASE 1: Si plugin deshabilitado, retorna null inmediatamente
   * 
   * @returns PolicyDecision si éxito, null si timeout/error/deshabilitado (usar fallback)
   */
  async evaluate(payload: EvaluatePolicyPayload): Promise<PolicyDecision | null> {
    // 🔌 FASE 1: Si plugin deshabilitado, usar lógica local
    if (!this.pluginEnabled) {
      return null;
    }

    try {
      const { data } = await this.client.post<PolicyDecision>('/policy/evaluate', payload);
      
      this.logger.log(
        `✅ [PolicyEngine PLUGIN] Evaluado: ${payload.qr_policy.policyType || 'STANDARD'} → ` +
        `${data.allow_continue ? 'ALLOW' : 'DENY'} (${data.reason})`
      );
      
      return data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        this.logger.warn(`⏱️ [PolicyEngine PLUGIN] Timeout (2s) - usando fallback local`);
      } else {
        this.logger.error(`❌ [PolicyEngine PLUGIN] Error: ${error.message} - usando fallback local`);
      }
      return null;
    }
  }

  /**
   * Valida si permisos otorgados cumplen con required
   */
  async validatePermissions(required: string[], granted: string[]): Promise<{ valid: boolean; missing: string[] } | null> {
    // 🔌 FASE 1: Si plugin deshabilitado, usar lógica local
    if (!this.pluginEnabled) return null;

    try {
      const { data } = await this.client.post('/policy/validate-permissions', {
        required,
        granted,
      });
      return data;
    } catch (error) {
      this.logger.warn(`❌ [PolicyEngine] Error validando permisos: ${error.message}`);
      return null;
    }
  }

  /**
   * Health check del microservicio
   */
  async healthCheck(): Promise<{ healthy: boolean }> {
    if (!this.pluginEnabled) return { healthy: false };

    try {
      const { data } = await this.client.get('/health');
      return { healthy: data.status === 'healthy' };
    } catch (error) {
      return { healthy: false };
    }
  }
}

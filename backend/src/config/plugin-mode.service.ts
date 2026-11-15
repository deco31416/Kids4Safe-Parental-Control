import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 🔌 Plugin Mode Service - FASE 1
 * 
 * Centraliza flags de microservicios opcionales.
 * Loggea al boot qué modo está activo (LOCAL | PLUGIN).
 * 
 * Default: LOCAL (lógica en backend)
 * Si flag = true → PLUGIN (microservicio)
 */
@Injectable()
export class PluginModeService implements OnModuleInit {
  private static hasInitialized = false;
  private readonly logger = new Logger(PluginModeService.name);

  // Flags de modo plugin
  public readonly usePolicyEngine: boolean;
  public readonly useSessionOrchestrator: boolean;
  public readonly useIpClassifier: boolean;
  public readonly useDeviceInfo: boolean;

  constructor(private configService: ConfigService) {
    this.usePolicyEngine = this.configService.get<boolean>('USE_POLICY_ENGINE', false);
    this.useSessionOrchestrator = this.configService.get<boolean>('USE_SESSION_ORCHESTRATOR', false);
    this.useIpClassifier = this.configService.get<boolean>('USE_IP_CLASSIFIER', false);
    this.useDeviceInfo = this.configService.get<boolean>('USE_DEVICE_INFO', false);
  }

  onModuleInit() {
    // Solo inicializar una vez
    if (PluginModeService.hasInitialized) {
      return;
    }
    PluginModeService.hasInitialized = true;
    
    this.logger.log('');
    this.logger.log('╔═══════════════════════════════════════════════════════════╗');
    this.logger.log('║          🔌 PLUGIN MODE CONFIGURATION (FASE 2)           ║');
    this.logger.log('╚═══════════════════════════════════════════════════════════╝');
    this.logger.log('');
    this.logger.log(`  Policy Engine:        ${this.getMode(this.usePolicyEngine)}`);
    this.logger.log(`  Session Orchestrator: ${this.getMode(this.useSessionOrchestrator)}`);
    this.logger.log(`  IP Classifier:        ${this.getMode(this.useIpClassifier)}`);
    this.logger.log(`  Device Info:          ${this.getMode(this.useDeviceInfo)}`);
    this.logger.log('');
    
    if (this.hasAnyPluginEnabled()) {
      this.logger.warn('⚠️  Plugins habilitados - asegurar que microservicios estén corriendo');
    } else {
      this.logger.log('✅ Modo LOCAL - Backend funciona sin microservicios');
    }
    
    this.logger.log('');
  }

  private getMode(enabled: boolean): string {
    return enabled ? '🔌 PLUGIN' : '🏠 LOCAL';
  }

  private hasAnyPluginEnabled(): boolean {
    return this.usePolicyEngine || 
           this.useSessionOrchestrator || 
           this.useIpClassifier || 
           this.useDeviceInfo;
  }

  /**
   * Helpers para servicios individuales
   */
  isPolicyEngineEnabled(): boolean {
    return this.usePolicyEngine;
  }

  isSessionOrchestratorEnabled(): boolean {
    return this.useSessionOrchestrator;
  }

  isIpClassifierEnabled(): boolean {
    return this.useIpClassifier;
  }

  isDeviceInfoEnabled(): boolean {
    return this.useDeviceInfo;
  }
}

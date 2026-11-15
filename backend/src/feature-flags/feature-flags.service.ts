import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeatureFlag, FeatureFlagDocument } from './feature-flag.schema';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private cache: Map<string, { enabled: boolean; cachedAt: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 segundos

  constructor(
    @InjectModel(FeatureFlag.name)
    private featureFlagModel: Model<FeatureFlagDocument>,
  ) {
    this.initializeDefaults();
  }

  /**
   * Inicializa feature flags por defecto si no existen
   */
  private async initializeDefaults() {
    const defaults = [
      { key: 'ml_triangulation', enabled: false, description: 'ML Triangulation Plugin' },
      { key: 'policy_engine', enabled: false, description: 'Policy Engine Plugin' },
      { key: 'session_orchestrator', enabled: false, description: 'Session Orchestrator Plugin' },
      { key: 'ip_classifier', enabled: false, description: 'IP Classifier Plugin' },
    ];

    for (const flag of defaults) {
      await this.featureFlagModel.updateOne(
        { key: flag.key },
        { $setOnInsert: flag },
        { upsert: true },
      );
    }
    
    this.logger.log('✅ Feature flags inicializados');
  }

  /**
   * Obtiene flag (con cache)
   */
  async getFlag(key: string): Promise<boolean> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.enabled;
    }

    const flag = await this.featureFlagModel.findOne({ key });
    const enabled = flag?.enabled ?? false;

    this.cache.set(key, { enabled, cachedAt: Date.now() });
    return enabled;
  }

  /**
   * Actualiza flag (invalida cache + retorna nuevo valor)
   */
  async setFlag(
    key: string,
    enabled: boolean,
    updatedBy: string,
    metadata?: Record<string, any>,
  ): Promise<FeatureFlagDocument> {
    const flag = await this.featureFlagModel.findOneAndUpdate(
      { key },
      {
        enabled,
        updatedBy,
        metadata,
        $currentDate: { updatedAt: true },
      },
      { upsert: true, new: true },
    );

    // Invalidar cache
    this.cache.delete(key);

    this.logger.log(
      `🔧 Feature flag "${key}" ${enabled ? 'ENABLED' : 'DISABLED'} by ${updatedBy}`,
    );

    return flag;
  }

  /**
   * Lista todos los flags
   */
  async getAllFlags(): Promise<FeatureFlagDocument[]> {
    return this.featureFlagModel.find().sort({ key: 1 }).exec();
  }

  /**
   * Invalida cache completo (útil para testing)
   */
  invalidateCache() {
    this.cache.clear();
    this.logger.log('🧹 Feature flags cache invalidado');
  }
}

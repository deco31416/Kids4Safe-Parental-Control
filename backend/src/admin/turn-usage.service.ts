import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TurnUsageSnapshot } from './turn-usage-snapshot.schema';

type MeteredCurrentUsage = {
  overageInGB?: number;
  quotaInGB?: number;
  usageInGB?: number;
};

export type TurnUsageSummary = {
  configured: boolean;
  provider: 'metered';
  region: string;
  planName: string;
  activatedAt: string | null;
  periodEnd: string | null;
  quotaGb: number;
  usageGb: number;
  overageGb: number;
  remainingGb: number;
  usagePercent: number;
  credentialApiKeyConfigured: boolean;
  credentialUsername?: string;
  lastCheckedAt: string;
  source: 'metered-api' | 'env-fallback';
};

@Injectable()
export class TurnUsageService {
  private readonly logger = new Logger(TurnUsageService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(TurnUsageSnapshot.name)
    private readonly snapshotModel: Model<TurnUsageSnapshot>,
  ) {}

  private async saveSnapshot(summary: TurnUsageSummary) {
    try {
      const lastSnapshot = await this.snapshotModel
        .findOne({ provider: summary.provider })
        .sort({ checkedAt: -1 })
        .lean();

      if (lastSnapshot) {
        const lastCheckedAt = new Date(lastSnapshot.checkedAt).getTime();
        const now = new Date(summary.lastCheckedAt).getTime();
        const withinSameMinute = now - lastCheckedAt < 60_000;
        const sameValues =
          lastSnapshot.source === summary.source &&
          lastSnapshot.usagePercent === summary.usagePercent &&
          lastSnapshot.usageGb === summary.usageGb &&
          lastSnapshot.quotaGb === summary.quotaGb &&
          lastSnapshot.overageGb === summary.overageGb;

        if (withinSameMinute && sameValues) {
          return;
        }
      }

      await this.snapshotModel.create({
        provider: summary.provider,
        region: summary.region,
        planName: summary.planName,
        periodEnd: summary.periodEnd || undefined,
        quotaGb: summary.quotaGb,
        usageGb: summary.usageGb,
        overageGb: summary.overageGb,
        remainingGb: summary.remainingGb,
        usagePercent: summary.usagePercent,
        source: summary.source,
        checkedAt: new Date(summary.lastCheckedAt),
      });
    } catch (error: any) {
      this.logger.warn(`No se pudo guardar snapshot TURN: ${error?.message || error}`);
    }
  }

  async getHistory(limit = 48) {
    const safeLimit = Math.min(Math.max(Number(limit) || 48, 1), 168);
    return this.snapshotModel
      .find({})
      .sort({ checkedAt: -1 })
      .limit(safeLimit)
      .lean();
  }

  async getMeteredUsage(): Promise<TurnUsageSummary> {
    const appName = this.configService.get<string>('METERED_TURN_APP_NAME');
    const secretKey = this.configService.get<string>('METERED_TURN_SECRET_KEY');
    const quotaGb = Number(this.configService.get<string>('METERED_TURN_QUOTA_GB') || 0.5);
    const region = this.configService.get<string>('METERED_TURN_REGION') || 'South America';
    const planName = this.configService.get<string>('METERED_TURN_PLAN_NAME') || 'Free Trial Global';
    const activatedAt = this.configService.get<string>('METERED_TURN_ACTIVATED_AT') || null;
    const periodEnd = this.configService.get<string>('METERED_TURN_PERIOD_END') || null;
    const credentialApiKey = this.configService.get<string>('METERED_TURN_CREDENTIAL_API_KEY');
    const credentialUsername = this.configService.get<string>('METERED_TURN_USERNAME');

    const baseSummary = (usage: MeteredCurrentUsage, source: TurnUsageSummary['source']): TurnUsageSummary => {
      const effectiveQuota = Number(usage.quotaInGB ?? quotaGb);
      const effectiveUsage = Number(usage.usageInGB ?? 0);
      const effectiveOverage = Number(usage.overageInGB ?? 0);
      const remainingGb = Math.max(effectiveQuota - effectiveUsage, 0);

      const summary: TurnUsageSummary = {
        configured: Boolean(appName && (secretKey || credentialApiKey)),
        provider: 'metered',
        region,
        planName,
        activatedAt,
        periodEnd,
        quotaGb: effectiveQuota,
        usageGb: effectiveUsage,
        overageGb: effectiveOverage,
        remainingGb,
        usagePercent: effectiveQuota > 0 ? Math.min((effectiveUsage / effectiveQuota) * 100, 100) : 0,
        credentialApiKeyConfigured: Boolean(credentialApiKey),
        credentialUsername,
        lastCheckedAt: new Date().toISOString(),
        source,
      };
      this.saveSnapshot(summary).catch(() => undefined);
      return summary;
    };

    if (!appName || !secretKey) {
      return baseSummary({}, 'env-fallback');
    }

    try {
      const url = new URL(`https://${appName}.metered.live/api/v1/turn/current_usage`);
      url.searchParams.set('secretKey', secretKey);

      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn(`Metered TURN usage failed: HTTP ${response.status} ${body}`);
        return baseSummary({}, 'env-fallback');
      }

      return baseSummary((await response.json()) as MeteredCurrentUsage, 'metered-api');
    } catch (error: any) {
      this.logger.warn(`Metered TURN usage unavailable: ${error?.message || error}`);
      return baseSummary({}, 'env-fallback');
    }
  }
}

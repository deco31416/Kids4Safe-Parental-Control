import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { MobileUnit, MobileUnitDocument } from './mobile-unit.schema';

@Injectable()
export class MobileUnitService {
  constructor(
    @InjectModel(MobileUnit.name)
    private readonly mobileUnitModel: Model<MobileUnitDocument>,
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private tokenMatches(token: string | undefined, expectedHash: string | undefined) {
    if (!token || !expectedHash) return false;
    const actual = Buffer.from(this.hash(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private normalizeNotificationToken(token?: string, provider = 'expo') {
    if (!token) return undefined;
    const normalizedProvider = provider.trim().toLowerCase() || 'expo';
    if (
      normalizedProvider === 'expo' &&
      !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)
    ) {
      throw new BadRequestException('Token Expo PUSH inválido');
    }
    return { provider: normalizedProvider, token };
  }

  async register(
    unitId: string,
    metadata: {
      deviceLabel?: string;
      appVersion?: string;
      platform?: string;
      notificationToken?: string;
      notificationProvider?: string;
    },
    suppliedUnitToken?: string,
  ) {
    const existing = await this.mobileUnitModel.findOne({ unitId }).select('+unitTokenHash').exec();
    const notification = this.normalizeNotificationToken(
      metadata.notificationToken,
      metadata.notificationProvider,
    );
    const update = {
      deviceLabel: metadata.deviceLabel,
      appVersion: metadata.appVersion,
      platform: metadata.platform,
      lastSeenAt: new Date(),
      ...(notification
        ? {
            notificationToken: {
              token: notification.token,
              provider: notification.provider,
              updatedAt: new Date(),
            },
          }
        : {}),
    };

    if (existing) {
      if (!this.tokenMatches(suppliedUnitToken, existing.unitTokenHash)) {
        throw new UnauthorizedException('Token de unidad movil invalido');
      }
      await this.mobileUnitModel.updateOne({ unitId }, { $set: update });
      return { unitId, registered: true };
    }

    const unitToken = randomBytes(32).toString('base64url');
    await this.mobileUnitModel.create({
      unitId,
      unitTokenHash: this.hash(unitToken),
      ...update,
    });
    return { unitId, unitToken, registered: true };
  }

  async getNotificationToken(unitId?: string) {
    if (!unitId) return undefined;
    const unit = await this.mobileUnitModel.findOne({ unitId }).select('notificationToken').lean().exec();
    return unit?.notificationToken?.token;
  }

  async clearNotificationToken(unitId: string, suppliedUnitToken?: string) {
    await this.assertUnitToken(unitId, suppliedUnitToken);
    await this.mobileUnitModel.updateOne(
      { unitId },
      {
        $set: { lastSeenAt: new Date() },
        $unset: { notificationToken: 1 },
      },
    );
    return { notificationsEnabled: false, unitId };
  }

  async assertUnitToken(unitId: string, suppliedUnitToken?: string) {
    const unit = await this.mobileUnitModel.findOne({ unitId }).select('+unitTokenHash').exec();
    if (!unit || !this.tokenMatches(suppliedUnitToken, unit.unitTokenHash)) {
      throw new UnauthorizedException('Token de unidad movil invalido');
    }
    return unit;
  }

  async updateLocation(
    unitId: string,
    suppliedUnitToken: string | undefined,
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      source?: string;
      timestampMs?: number;
    },
  ) {
    await this.assertUnitToken(unitId, suppliedUnitToken);

    const lastLocation = {
      ...location,
      updatedAt: new Date(),
    };

    await this.mobileUnitModel.updateOne(
      { unitId },
      {
        $set: {
          lastLocation,
          ...(location.source === 'gps-always'
            ? {
                gpsAlwaysEnabled: true,
                gpsAlwaysUpdatedAt: lastLocation.updatedAt,
              }
            : {}),
          lastSeenAt: new Date(),
        },
      },
    );

    return { unitId, lastLocation };
  }

  async updateGpsAlwaysStatus(
    unitId: string,
    suppliedUnitToken: string | undefined,
    enabled: boolean,
  ) {
    await this.assertUnitToken(unitId, suppliedUnitToken);

    const gpsAlwaysUpdatedAt = new Date();
    await this.mobileUnitModel.updateOne(
      { unitId },
      {
        $set: {
          gpsAlwaysEnabled: enabled,
          gpsAlwaysUpdatedAt,
          lastSeenAt: gpsAlwaysUpdatedAt,
        },
      },
    );

    return { unitId, gpsAlwaysEnabled: enabled, gpsAlwaysUpdatedAt };
  }

  async linkSession(unitId: string, sessionId: string) {
    await this.mobileUnitModel.updateOne(
      { unitId },
      { $set: { lastSessionId: sessionId, lastSeenAt: new Date() } },
    );
  }

  async getPushTargetSessionIds() {
    const units = await this.mobileUnitModel
      .find({
        lastSessionId: { $exists: true, $ne: '' },
        'notificationToken.token': { $exists: true, $ne: '' },
      })
      .select('lastSessionId')
      .lean()
      .exec();
    return units.map((unit) => unit.lastSessionId).filter(Boolean) as string[];
  }

  async listForAdmin(limit = 100) {
    const boundedLimit = Math.max(1, Math.min(limit, 500));
    const units = await this.mobileUnitModel
      .find({})
      .sort({ lastSeenAt: -1 })
      .limit(boundedLimit)
      .select('unitId deviceLabel appVersion platform lastSessionId notificationToken lastLocation gpsAlwaysEnabled gpsAlwaysUpdatedAt lastSeenAt createdAt updatedAt')
      .lean()
      .exec();
    return units.map((unit) => ({
      ...unit,
      notificationToken: unit.notificationToken
        ? {
            configured: Boolean(unit.notificationToken.token),
            provider: unit.notificationToken.provider,
            updatedAt: unit.notificationToken.updatedAt,
          }
        : undefined,
    }));
  }
}

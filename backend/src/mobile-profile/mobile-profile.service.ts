import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { MobileUnit, MobileUnitDocument } from '../mobile/mobile-unit.schema';
import { MobileUser, MobileUserDocument } from '../mobile-auth/schemas/mobile-user.schema';
import { MobileProfile, MobileProfileDocument } from './mobile-profile.schema';

const BLOOD_TYPES = new Set(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', '']);

export type MobileProfilePayload = {
  avatarDataUrl?: string;
  avatarUri?: string;
  bloodType?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  fullName?: string;
  phone?: string;
};

export type MobileProfileAdminActor = {
  userId?: string;
  username?: string;
};

@Injectable()
export class MobileProfileService {
  constructor(
    @InjectModel(MobileProfile.name)
    private readonly profileModel: Model<MobileProfileDocument>,
    @InjectModel(MobileUnit.name)
    private readonly mobileUnitModel: Model<MobileUnitDocument>,
    @InjectModel(MobileUser.name)
    private readonly mobileUserModel: Model<MobileUserDocument>,
    private readonly auditService: AuditService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  private createSecurityId(mobileUnitId: string) {
    const base = mobileUnitId.replace(/^mobile-/, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    return `BP-${base || 'UNIT'}`;
  }

  private createUserSecurityId(mobileUserId: string) {
    const base = mobileUserId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    return `BP-${base || 'USER'}`;
  }

  private normalizeIdentityText(value?: string) {
    return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizePhone(value?: string) {
    return (value || '').replace(/[^\d+]/g, '');
  }

  private isProfileCompatibleWithUser(profile: any, user: any, mobileUserId: string) {
    if (!profile) return false;
    if (profile.mobileUserId) return profile.mobileUserId === mobileUserId;

    const profilePhone = this.normalizePhone(profile.phone);
    const userPhone = this.normalizePhone(user.phone);
    if (profilePhone && userPhone) return profilePhone === userPhone;

    const profileName = this.normalizeIdentityText(profile.fullName);
    const userName = this.normalizeIdentityText(user.fullName);
    if (profileName && userName) return profileName === userName;

    return !profilePhone && !profileName;
  }

  private normalizePayload(payload: MobileProfilePayload, partial = false) {
    const normalized: Record<string, any> = {};

    if (!partial || Object.prototype.hasOwnProperty.call(payload, 'bloodType')) {
      normalized.bloodType = payload.bloodType && BLOOD_TYPES.has(payload.bloodType) ? payload.bloodType : '';
    }

    if (!partial || Object.prototype.hasOwnProperty.call(payload, 'emergencyContact')) {
      normalized.emergencyContact = {
        name: payload.emergencyContact?.name?.trim() || '',
        relationship: payload.emergencyContact?.relationship?.trim() || '',
        phone: payload.emergencyContact?.phone?.trim() || '',
      };
    }

    if (!partial || Object.prototype.hasOwnProperty.call(payload, 'fullName')) {
      normalized.fullName = payload.fullName?.trim() || '';
    }

    if (!partial || Object.prototype.hasOwnProperty.call(payload, 'phone')) {
      normalized.phone = payload.phone?.trim() || '';
    }

    return normalized;
  }

  private validateAvatarDataUrl(avatarDataUrl?: string) {
    if (!avatarDataUrl) return undefined;

    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(avatarDataUrl)) {
      throw new BadRequestException('Formato de avatar no permitido');
    }

    if (avatarDataUrl.length > 5_600_000) {
      throw new BadRequestException('Avatar demasiado grande');
    }

    return avatarDataUrl;
  }

  private sanitizeProfile(profile: any) {
    if (!profile) return profile;
    const plain = typeof profile.toObject === 'function' ? profile.toObject() : { ...profile };
    if (plain.avatarPublicId) {
      plain.avatarUri = this.mediaStorage.getSignedUrl(plain.avatarPublicId);
      plain.avatarThumbnailUrl = plain.avatarUri;
    }
    delete plain.avatarPublicId;
    return plain;
  }

  private async fillMissingUserProfileFields(profile: any, user: any) {
    if (!profile) return profile;

    const patch: Record<string, string> = {};
    if (!profile.fullName && user.fullName) patch.fullName = user.fullName;
    if (!profile.phone && user.phone) patch.phone = user.phone;

    if (!Object.keys(patch).length) return profile;

    const updatedProfile = await this.profileModel
      .findByIdAndUpdate(profile._id, { $set: patch }, { new: true })
      .lean()
      .exec();
    if (updatedProfile?.mobileUserId) {
      await this.mirrorProfileToUserUnits(updatedProfile.mobileUserId, updatedProfile);
    }

    return updatedProfile;
  }

  private mergeUnitAndProfile(unit: any, profile?: any) {
    const safeProfile = this.sanitizeProfile(profile) || {};
    return {
      ...safeProfile,
      mobileUnitId: unit.unitId,
      mobileUserId: safeProfile.mobileUserId || '',
      securityId: safeProfile.securityId || this.createSecurityId(unit.unitId),
      fullName: safeProfile.fullName || '',
      phone: safeProfile.phone || '',
      emergencyContact: safeProfile.emergencyContact || {},
      bloodType: safeProfile.bloodType || '',
      avatarUri: safeProfile.avatarUri || '',
      avatarThumbnailUrl: safeProfile.avatarThumbnailUrl || '',
      profileExists: Boolean(profile),
      deviceLabel: unit.deviceLabel || '',
      appVersion: unit.appVersion || '',
      platform: unit.platform || '',
      lastSessionId: unit.lastSessionId || '',
      notificationProvider: unit.notificationToken?.provider || '',
      notificationUpdatedAt: unit.notificationToken?.updatedAt || null,
      notificationsEnabled: Boolean(unit.notificationToken?.token),
      lastLocation: unit.lastLocation || null,
      gpsAlwaysEnabled: Boolean(unit.gpsAlwaysEnabled),
      gpsAlwaysUpdatedAt: unit.gpsAlwaysUpdatedAt || null,
      lastSeenAt: unit.lastSeenAt,
      createdAt: safeProfile.createdAt || unit.createdAt,
      updatedAt: safeProfile.updatedAt || unit.updatedAt,
    };
  }

  async getOrCreate(mobileUnitId: string) {
    const existing = await this.profileModel.findOne({ mobileUnitId }).lean().exec();
    if (existing) return this.sanitizeProfile(existing);

    const created = await this.profileModel.create({
      mobileUnitId,
      securityId: this.createSecurityId(mobileUnitId),
      bloodType: '',
      emergencyContact: {},
    });
    return this.sanitizeProfile(created);
  }

  async getOrCreateForUser(mobileUserId: string) {
    const existingByUser = await this.profileModel.findOne({ mobileUserId }).lean().exec();
    const user = await this.mobileUserModel.findById(mobileUserId).lean().exec();
    if (!user) {
      throw new NotFoundException('Usuario movil no encontrado');
    }

    if (existingByUser) {
      const profile = await this.fillMissingUserProfileFields(existingByUser, user);
      return this.sanitizeProfile(profile);
    }

    const unitIds = [
      user.primaryMobileUnitId,
      ...(user.linkedMobileUnitIds || []),
    ].filter(Boolean) as string[];

    const existingByUnit = unitIds.length
      ? await this.profileModel
          .findOne({ mobileUnitId: { $in: unitIds } })
          .sort({ avatarUri: -1, updatedAt: -1 })
          .lean()
          .exec()
      : null;

    if (this.isProfileCompatibleWithUser(existingByUnit, user, mobileUserId)) {
      const profile = await this.profileModel
        .findOneAndUpdate(
          { mobileUnitId: existingByUnit.mobileUnitId },
          {
            $set: {
              mobileUserId,
              fullName: existingByUnit.fullName || user.fullName || '',
              phone: existingByUnit.phone || user.phone || '',
            },
          },
          { new: true },
        )
        .lean()
        .exec();

      return this.sanitizeProfile(profile);
    }

    const mobileUnitId = existingByUnit ? `user-${mobileUserId}` : user.primaryMobileUnitId || unitIds[0] || `user-${mobileUserId}`;
    const created = await this.profileModel.create({
      mobileUserId,
      mobileUnitId,
      securityId: mobileUnitId.startsWith('mobile-')
        ? this.createSecurityId(mobileUnitId)
        : this.createUserSecurityId(mobileUserId),
      fullName: user.fullName || '',
      phone: user.phone || '',
      bloodType: '',
      emergencyContact: {},
    });

    return this.sanitizeProfile(created);
  }

  private async mirrorProfileToUserUnits(mobileUserId: string, sourceProfile: any) {
    const user = await this.mobileUserModel.findById(mobileUserId).lean().exec();
    if (!user) return;

    const unitIds = Array.from(new Set([
      user.primaryMobileUnitId,
      ...(user.linkedMobileUnitIds || []),
    ].filter(Boolean))) as string[];

    await Promise.all(
      unitIds.map((mobileUnitId) =>
        this.profileModel
          .findOneAndUpdate(
            { mobileUnitId },
            {
              $set: {
                mobileUserId,
                defaultAvatar: sourceProfile.defaultAvatar || 'perfil01',
                avatarThumbnailUrl: sourceProfile.avatarThumbnailUrl || '',
                avatarUri: sourceProfile.avatarUri || '',
                bloodType: sourceProfile.bloodType || '',
                emergencyContact: sourceProfile.emergencyContact || {},
                fullName: sourceProfile.fullName || user.fullName || '',
                phone: sourceProfile.phone || user.phone || '',
              },
              $setOnInsert: {
                mobileUnitId,
                securityId: this.createSecurityId(mobileUnitId),
              },
            },
            { upsert: true },
          )
          .exec(),
      ),
    );
  }

  async updateForUser(mobileUserId: string, payload: MobileProfilePayload) {
    const existingProfile = await this.getOrCreateForUser(mobileUserId);
    const normalized = this.normalizePayload(payload);
    const avatarDataUrl = this.validateAvatarDataUrl(payload.avatarDataUrl);
    const existing = avatarDataUrl
      ? await this.profileModel.findById(existingProfile._id).select('avatarPublicId').lean().exec()
      : null;
    const avatarUpload = avatarDataUrl
      ? await this.mediaStorage.uploadMobileAvatar(existingProfile.mobileUnitId || `user-${mobileUserId}`, avatarDataUrl)
      : null;

    if (avatarUpload) {
      normalized.avatarUri = avatarUpload.url;
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        { _id: existingProfile._id },
        {
          $set: {
            ...normalized,
            ...(avatarUpload
              ? {
                  avatarPublicId: avatarUpload.publicId,
                  avatarThumbnailUrl: avatarUpload.thumbnailUrl,
                }
              : {}),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (avatarUpload && existing?.avatarPublicId && existing.avatarPublicId !== avatarUpload.publicId) {
      await this.mediaStorage.deleteFile(existing.avatarPublicId).catch(() => {});
    }

    await this.mirrorProfileToUserUnits(mobileUserId, profile);

    await this.auditService.log({
      eventType: 'MOBILE_PROFILE_UPDATED',
      actorType: 'user',
      actorId: mobileUserId,
      metadata: {
        mobileUserId,
        fields: Object.keys(normalized),
      },
      severity: 'info',
    });

    return this.sanitizeProfile(profile);
  }

  async update(mobileUnitId: string, payload: MobileProfilePayload) {
    const normalized = this.normalizePayload(payload);
    const avatarDataUrl = this.validateAvatarDataUrl(payload.avatarDataUrl);
    const existing = avatarDataUrl
      ? await this.profileModel.findOne({ mobileUnitId }).select('avatarPublicId').lean().exec()
      : null;
    const avatarUpload = avatarDataUrl
      ? await this.mediaStorage.uploadMobileAvatar(mobileUnitId, avatarDataUrl)
      : null;

    if (avatarUpload) {
      normalized.avatarUri = avatarUpload.url;
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        { mobileUnitId },
        {
          $set: {
            ...normalized,
            ...(avatarUpload
              ? {
                  avatarPublicId: avatarUpload.publicId,
                  avatarThumbnailUrl: avatarUpload.thumbnailUrl,
                }
              : {}),
          },
          $setOnInsert: {
            mobileUnitId,
            securityId: this.createSecurityId(mobileUnitId),
          },
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();

    if (avatarUpload && existing?.avatarPublicId && existing.avatarPublicId !== avatarUpload.publicId) {
      await this.mediaStorage.deleteFile(existing.avatarPublicId).catch(() => {});
    }

    await this.auditService.log({
      eventType: 'MOBILE_PROFILE_UPDATED',
      actorType: 'user',
      actorId: mobileUnitId,
      metadata: {
        mobileUnitId,
        fields: Object.keys(normalized),
      },
      severity: 'info',
    });

    return this.sanitizeProfile(profile);
  }

  async syncUserProfileToUnit(mobileUserId: string, mobileUnitId?: string) {
    const user = await this.mobileUserModel.findById(mobileUserId).lean().exec();
    if (!user) return;

    const profile = await this.getOrCreateForUser(mobileUserId);
    const mergedProfile = await this.profileModel
      .findOneAndUpdate(
        { _id: profile._id },
        {
          $set: {
            fullName: profile.fullName || user.fullName || '',
            phone: profile.phone || user.phone || '',
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    await this.mirrorProfileToUserUnits(mobileUserId, mergedProfile);
    if (mobileUnitId && !(user.linkedMobileUnitIds || []).includes(mobileUnitId) && user.primaryMobileUnitId !== mobileUnitId) {
      await this.profileModel
        .findOneAndUpdate(
          { mobileUnitId },
          {
            $set: {
              mobileUserId,
              defaultAvatar: mergedProfile.defaultAvatar || 'perfil01',
              avatarThumbnailUrl: mergedProfile.avatarThumbnailUrl || '',
              avatarUri: mergedProfile.avatarUri || '',
              bloodType: mergedProfile.bloodType || '',
              emergencyContact: mergedProfile.emergencyContact || {},
              fullName: mergedProfile.fullName || user.fullName || '',
              phone: mergedProfile.phone || user.phone || '',
            },
            $setOnInsert: {
              mobileUnitId,
              securityId: this.createSecurityId(mobileUnitId),
            },
          },
          { upsert: true },
        )
        .exec();
    }
  }

  async listForAdmin(options?: { page?: string | number; limit?: string | number; search?: string }) {
    const requestedLimit = Number(options?.limit || 20);
    const requestedPage = Number(options?.page || 1);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1), 100);
    const page = Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1);
    const skip = (page - 1) * limit;
    const unitQuery: Record<string, any> = {};

    const search = String(options?.search || '').trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const matchingProfiles = await this.profileModel
        .find({
          $or: [
            { mobileUnitId: regex },
            { securityId: regex },
            { fullName: regex },
            { phone: regex },
            { 'emergencyContact.name': regex },
            { 'emergencyContact.phone': regex },
          ],
        })
        .select('mobileUnitId')
        .limit(500)
        .lean()
        .exec();

      unitQuery.$or = [
        { unitId: regex },
        { deviceLabel: regex },
        { platform: regex },
        { appVersion: regex },
        { lastSessionId: regex },
        ...(matchingProfiles.length
          ? [{ unitId: { $in: matchingProfiles.map((profile) => profile.mobileUnitId).filter(Boolean) } }]
          : []),
      ];
    }

    const [units, total] = await Promise.all([
      this.mobileUnitModel
        .find(unitQuery)
        .select('unitId deviceLabel appVersion platform lastSessionId notificationToken lastLocation gpsAlwaysEnabled gpsAlwaysUpdatedAt lastSeenAt createdAt updatedAt')
        .sort({ lastSeenAt: -1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.mobileUnitModel.countDocuments(unitQuery).exec(),
    ]);

    const unitIds = units.map((unit) => unit.unitId);
    const profiles = unitIds.length
      ? await this.profileModel
          .find({ mobileUnitId: { $in: unitIds } })
          .select('mobileUnitId mobileUserId securityId fullName phone emergencyContact bloodType avatarUri avatarThumbnailUrl assignedByAdmin createdAt updatedAt')
          .lean()
          .exec()
      : [];
    const profilesByUnitId = new Map(profiles.map((profile) => [profile.mobileUnitId, profile]));
    const mergedProfiles = units.map((unit) => this.mergeUnitAndProfile(unit, profilesByUnitId.get(unit.unitId)));

    return {
      profiles: mergedProfiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: skip + mergedProfiles.length < total,
      },
    };
  }

  async getForAdmin(mobileUnitId: string) {
    const unit = await this.mobileUnitModel
      .findOne({ unitId: mobileUnitId })
      .select('unitId deviceLabel appVersion platform lastSessionId notificationToken lastLocation gpsAlwaysEnabled gpsAlwaysUpdatedAt lastSeenAt createdAt updatedAt')
      .lean()
      .exec();

    if (!unit) {
      throw new NotFoundException('Unidad movil no encontrada');
    }

    const profile = await this.profileModel
      .findOne({ mobileUnitId })
      .select('mobileUnitId mobileUserId securityId fullName phone emergencyContact bloodType avatarUri avatarThumbnailUrl assignedByAdmin createdAt updatedAt')
      .lean()
      .exec();

    return this.mergeUnitAndProfile(unit, profile);
  }

  async updateByAdmin(mobileUnitId: string, payload: MobileProfilePayload, actor: MobileProfileAdminActor) {
    const unit = await this.mobileUnitModel.findOne({ unitId: mobileUnitId }).select('unitId').lean().exec();
    if (!unit) {
      throw new NotFoundException('Unidad movil no encontrada');
    }

    const adminPayload = { ...payload };
    delete adminPayload.avatarUri;
    const existing = await this.profileModel.findOne({ mobileUnitId }).exec();
    const normalized = this.normalizePayload(adminPayload, true);
    const avatarDataUrl = this.validateAvatarDataUrl(payload.avatarDataUrl);

    if (avatarDataUrl) {
      const previousPublicId = existing?.avatarPublicId;
      const avatarUpload = await this.mediaStorage.uploadMobileAvatar(mobileUnitId, avatarDataUrl);
      normalized.avatarUri = avatarUpload.url;
      normalized.avatarPublicId = avatarUpload.publicId;
      normalized.avatarThumbnailUrl = avatarUpload.thumbnailUrl;

      if (previousPublicId && previousPublicId !== avatarUpload.publicId) {
        await this.mediaStorage.deleteFile(previousPublicId).catch(() => {});
      }
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        { mobileUnitId },
        {
          $set: {
            ...normalized,
            assignedByAdmin: {
              adminId: actor.userId,
              assignedAt: new Date(),
              source: actor.username || 'admin',
            },
          },
          $setOnInsert: {
            mobileUnitId,
            securityId: this.createSecurityId(mobileUnitId),
          },
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();

    await this.auditService.log({
      eventType: 'MOBILE_PROFILE_UPDATED_BY_ADMIN',
      actorType: 'admin',
      actorId: actor.userId,
      actorUsername: actor.username,
      severity: 'info',
      metadata: {
        mobileUnitId,
        fields: Object.keys(normalized),
      },
    });

    return this.sanitizeProfile(profile);
  }
}

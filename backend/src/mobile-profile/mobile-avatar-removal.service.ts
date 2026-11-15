import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { MobileProfile, MobileProfileDocument } from './mobile-profile.schema';
import { MobileProfileAdminActor, MobileProfileService } from './mobile-profile.service';

@Injectable()
export class MobileAvatarRemovalService {
  constructor(
    @InjectModel(MobileProfile.name)
    private readonly profiles: Model<MobileProfileDocument>,
    private readonly storage: MediaStorageService,
    private readonly audit: AuditService,
    private readonly profileService: MobileProfileService,
  ) {}

  async removeByAdmin(mobileUnitId: string, actor: MobileProfileAdminActor) {
    const profile = await this.profiles.findOne({ mobileUnitId }).lean().exec();
    if (!profile) throw new NotFoundException('Perfil movil no encontrado');

    const references = [profile.avatarUri, profile.avatarThumbnailUrl].filter(Boolean);
    const referenceQuery = [
      ...(profile.avatarPublicId ? [{ avatarPublicId: profile.avatarPublicId }] : []),
      ...references.map((value) => ({ avatarUri: value })),
      ...references.map((value) => ({ avatarThumbnailUrl: value })),
    ];
    if (referenceQuery.length) {
      await this.profiles.updateMany(
        { $or: referenceQuery },
        { $unset: { avatarPublicId: 1, avatarThumbnailUrl: 1, avatarUri: 1 } },
      ).exec();
    }
    if (profile.avatarPublicId?.startsWith('profiles/mobile/')) {
      await this.storage.deleteFile(profile.avatarPublicId);
    }

    await this.audit.log({
      eventType: 'MOBILE_PROFILE_AVATAR_REMOVED_BY_ADMIN',
      actorType: 'admin', actorId: actor.userId, actorUsername: actor.username,
      severity: 'info', metadata: { mobileUnitId },
    });
    return this.profileService.getForAdmin(mobileUnitId);
  }
}

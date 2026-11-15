import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { MobileUnit, MobileUnitSchema } from '../mobile/mobile-unit.schema';
import { MobileUser, MobileUserSchema } from '../mobile-auth/schemas/mobile-user.schema';
import { MobileUnitModule } from '../mobile/mobile-unit.module';
import { MobileProfileController } from './mobile-profile.controller';
import { MobileProfileAdminController } from './mobile-profile-admin.controller';
import { MobileProfileMeController } from './mobile-profile-me.controller';
import { MobileProfile, MobileProfileSchema } from './mobile-profile.schema';
import { MobileAvatarRemovalService } from './mobile-avatar-removal.service';
import { MobileProfileService } from './mobile-profile.service';

@Module({
  imports: [
    AuditModule,
    MobileUnitModule,
    MongooseModule.forFeature([
      { name: MobileProfile.name, schema: MobileProfileSchema },
      { name: MobileUnit.name, schema: MobileUnitSchema },
      { name: MobileUser.name, schema: MobileUserSchema },
    ]),
  ],
  controllers: [MobileProfileController, MobileProfileAdminController, MobileProfileMeController],
  providers: [MobileProfileService, MobileAvatarRemovalService],
  exports: [MobileProfileService],
})
export class MobileProfileModule {}

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AudioClipsModule } from '../audio-clips/audio-clips.module';
import { LiveModule } from '../live/live.module';
import { LocationModule } from '../location/location.module';
import { NotificationModule } from '../notification/notification.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { SessionModule } from '../session/session.module';
import { MobileController } from './mobile.controller';
import { MobileProfileModule } from '../mobile-profile/mobile-profile.module';
import { MobileUnitModule } from './mobile-unit.module';

@Module({
  imports: [AuditModule, AudioClipsModule, LiveModule, LocationModule, MobileProfileModule, MobileUnitModule, NotificationModule, RealtimeModule, ScreenshotsModule, SessionModule],
  controllers: [MobileController],
})
export class MobileModule {}

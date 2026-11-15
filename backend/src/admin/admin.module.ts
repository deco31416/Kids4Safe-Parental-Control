import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LocationModule } from '../location/location.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { AuditModule } from '../audit/audit.module';
import { TurnUsageService } from './turn-usage.service';
import { SessionModule } from '../session/session.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MobileUnitModule } from '../mobile/mobile-unit.module';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { AudioClipsModule } from '../audio-clips/audio-clips.module';
import { RecordingsModule } from '../recordings/recordings.module';
import { TurnUsageSnapshot, TurnUsageSnapshotSchema } from './turn-usage-snapshot.schema';

@Module({
  imports: [
    LocationModule,
    FeatureFlagsModule,
    AuditModule,
    SessionModule,
    RealtimeModule,
    MobileUnitModule,
    ScreenshotsModule,
    AudioClipsModule,
    RecordingsModule,
    MongooseModule.forFeature([{ name: TurnUsageSnapshot.name, schema: TurnUsageSnapshotSchema }]),
  ],
  controllers: [AdminController],
  providers: [AdminService, TurnUsageService],
  exports: [AdminService],
})
export class AdminModule {}

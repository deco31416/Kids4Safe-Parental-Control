import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeGateway } from './realtime.gateway';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { AudioClipsModule } from '../audio-clips/audio-clips.module';
import { AuthModule } from '../auth/auth.module';
import { Session, SessionSchema } from '../session/session.schema';

@Module({
  imports: [
    AuthModule,
    ScreenshotsModule,
    AudioClipsModule,
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}

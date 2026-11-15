import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
import { LocationModule } from '../location/location.module';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { Session, SessionSchema } from '../session/session.schema';
import { SessionModule } from '../session/session.module';
import { LiveSessionGuard } from './live-session.guard';

@Module({
  imports: [
    HttpModule,
    SessionModule,
    LocationModule,
    AuditModule,
    RealtimeModule,
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  controllers: [LiveController],
  providers: [LiveService, LiveSessionGuard],
  exports: [LiveService],
})
export class LiveModule {}

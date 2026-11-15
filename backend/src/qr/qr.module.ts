import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QRService } from './qr.service';
import { QRController } from './qr.controller';
import { PolicyService } from './policy.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { Session, SessionSchema } from '../session/session.schema';

@Module({
  imports: [
    RealtimeModule,
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  controllers: [QRController],
  providers: [QRService, PolicyService],
  exports: [QRService, PolicyService],
})
export class QRModule {}

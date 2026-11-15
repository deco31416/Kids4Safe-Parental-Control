import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './notification.schema';
import { RealtimeModule } from '../realtime/realtime.module';
import { Session, SessionSchema } from '../session/session.schema';
import { MobileUnitModule } from '../mobile/mobile-unit.module';
import { SessionModule } from '../session/session.module';
import { WebPushController } from './web-push/web-push.controller';
import { WebPushService } from './web-push/web-push.service';
import {
  WebPushSubscription,
  WebPushSubscriptionSchema,
} from './web-push/web-push-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Session.name, schema: SessionSchema },
      { name: WebPushSubscription.name, schema: WebPushSubscriptionSchema },
    ]),
    RealtimeModule, // Para acceder al RealtimeGateway y emitir WebSocket events
    MobileUnitModule,
    SessionModule,
  ],
  controllers: [NotificationController, WebPushController],
  providers: [NotificationService, WebPushService],
  exports: [NotificationService], // Exportar para usar en otros módulos
})
export class NotificationModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionModule } from '../session/session.module';
import { IceServersService } from './ice-servers.service';
import { MeteredTurnClient } from './metered-turn.client';
import { WebrtcController } from './webrtc.controller';

@Module({
  imports: [AuthModule, SessionModule],
  controllers: [WebrtcController],
  providers: [IceServersService, MeteredTurnClient],
  exports: [IceServersService],
})
export class WebrtcModule {}

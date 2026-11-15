import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { Session, SessionSchema } from './session.schema';
import { SessionCorrelationService } from './session-correlation.service';
import { QRModule } from '../qr/qr.module';
import { OrchestratorClient } from './orchestrator.client';
import { SessionMonitorService } from './session-monitor.service';
import { PolicyEngineClient } from './policy-engine.client';
import { LocalPolicyService } from './local-policy.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    QRModule,
    AuditModule,
  ],
  controllers: [SessionController],
  providers: [
    SessionService,
    SessionCorrelationService,
    OrchestratorClient,
    SessionMonitorService,
    PolicyEngineClient,
    LocalPolicyService,
  ],
  exports: [SessionService, SessionCorrelationService, MongooseModule, OrchestratorClient, PolicyEngineClient, LocalPolicyService],
})
export class SessionModule {}

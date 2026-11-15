import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthAggregateService } from './health-aggregate.service';
import { HealthCheckService } from './health-check.service';
import { HealthController } from './health.controller';
import { MicroserviceHealthController } from './microservice-health.controller';

@Module({
  imports: [AuthModule],
  controllers: [HealthController, MicroserviceHealthController],
  providers: [HealthCheckService, HealthAggregateService],
})
export class HealthModule {}

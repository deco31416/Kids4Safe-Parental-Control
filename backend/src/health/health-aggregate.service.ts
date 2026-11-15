import { Injectable } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';

const MICROSERVICE_KEYS = [
  'deviceInfo',
  'location',
  'locationTrack',
  'screenRecorder',
  'auditLog',
  'policyEngine',
  'ipClassifier',
  'sessionOrchestrator',
] as const;

@Injectable()
export class HealthAggregateService {
  constructor(private readonly checks: HealthCheckService) {}

  async getGlobalHealth() {
    const runtimeServices = this.checks.getRuntimeServices();
    const runtimeChecks = await Promise.all(
      Object.entries(runtimeServices).map(async ([key, config]) => [
        key,
        await this.checks.checkHttpService(key, config.url, config.healthPath),
      ]),
    );
    const backend = this.checks.checkBackend();
    const services = {
      apiGateway: backend,
      backend,
      ...Object.fromEntries(runtimeChecks),
    };
    const infrastructure = {
      redis: await this.checks.checkRedis(),
      mongodb: this.checks.checkMongoDB(),
    };
    const statuses = [
      ...Object.values(services),
      ...Object.values(infrastructure),
    ] as Array<{ status: string }>;
    const healthy = statuses.every((service) => service.status === 'up');

    return {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
      infrastructure,
    };
  }

  async getMicroservicesHealth() {
    const services = this.checks.getRuntimeServices();
    const results = await Promise.all(
      MICROSERVICE_KEYS.map(async (key) => [
        key,
        await this.checks.checkHttpService(key, services[key].url, services[key].healthPath),
      ]),
    );
    return Object.fromEntries(results);
  }
}

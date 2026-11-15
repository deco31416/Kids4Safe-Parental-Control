import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { HealthAggregateService } from './health-aggregate.service';
import { HealthCheckService } from './health-check.service';

const protectedHealth = [AuthGuard('jwt'), PermissionsGuard];

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(
    private readonly checks: HealthCheckService,
    private readonly aggregate: HealthAggregateService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check simple para Railway' })
  @ApiResponse({ status: 200, description: 'Backend operativo' })
  getSimpleHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'kids4safe-backend',
    };
  }

  @Get('full')
  @UseGuards(...protectedHealth)
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Health check global del sistema' })
  getGlobalHealth() {
    return this.aggregate.getGlobalHealth();
  }

  @Get('backend')
  @UseGuards(...protectedHealth)
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Health check del Backend NestJS' })
  getBackendHealth() {
    return this.checks.checkBackend();
  }

  @Get('redis')
  @UseGuards(...protectedHealth)
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Health check de Redis' })
  getRedisHealth() {
    return this.checks.checkRedis();
  }

  @Get('mongodb')
  @UseGuards(...protectedHealth)
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Health check de MongoDB' })
  getMongoHealth() {
    return this.checks.checkMongoDB();
  }

  @Get('microservices')
  @UseGuards(...protectedHealth)
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Health check de los microservicios Python activos' })
  getMicroservicesHealth() {
    return this.aggregate.getMicroservicesHealth();
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { HealthCheckService } from './health-check.service';

@ApiTags('Health Check')
@Controller('health/microservices')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('view_sessions')
export class MicroserviceHealthController {
  constructor(private readonly checks: HealthCheckService) {}

  @Get('device-info')
  @ApiOperation({ summary: 'Health check del Device Info Service' })
  getDeviceInfoHealth() {
    return this.check('deviceInfo');
  }

  @Get('location')
  @ApiOperation({ summary: 'Health check del Location Service' })
  getLocationHealth() {
    return this.check('location');
  }

  @Get('screen-recorder')
  @ApiOperation({ summary: 'Health check del Screen Recorder Service' })
  getScreenRecorderHealth() {
    return this.check('screenRecorder');
  }

  private check(key: 'deviceInfo' | 'location' | 'screenRecorder') {
    const service = this.checks.getRuntimeServices()[key];
    return this.checks.checkHttpService(key, service.url, service.healthPath);
  }
}

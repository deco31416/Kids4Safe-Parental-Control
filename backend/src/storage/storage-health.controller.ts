import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FileStorageService } from './file-storage.service';

@Controller('storage')
export class StorageHealthController {
  constructor(private readonly files: FileStorageService) {}

  @Get('health')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_sessions')
  async health() {
    const health = await this.files.health();
    if (!health.available) throw new ServiceUnavailableException(health);
    return health;
  }
}

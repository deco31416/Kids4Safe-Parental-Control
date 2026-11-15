import { Body, Controller, Delete, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MobileProfileDto } from './dto/mobile-profile.dto';
import { MobileAvatarRemovalService } from './mobile-avatar-removal.service';
import { MobileProfileService } from './mobile-profile.service';

@ApiTags('Admin Mobile Profiles')
@Controller('admin/mobile/profiles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class MobileProfileAdminController {
  constructor(
    private readonly mobileProfileService: MobileProfileService,
    private readonly avatarRemoval: MobileAvatarRemovalService,
  ) {}

  @Get()
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Listar perfiles de usuarios de app movil' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return {
      success: true,
      ...(await this.mobileProfileService.listForAdmin({ page, limit, search })),
    };
  }

  @Get(':mobileUnitId')
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Obtener ficha de usuario de app movil por unidad' })
  async getOne(@Param('mobileUnitId') mobileUnitId: string) {
    return {
      success: true,
      profile: await this.mobileProfileService.getForAdmin(mobileUnitId),
    };
  }

  @Patch(':mobileUnitId')
  @Permissions('manage_sessions')
  @ApiOperation({ summary: 'Actualizar ficha de usuario de app movil desde el panel' })
  async update(
    @Param('mobileUnitId') mobileUnitId: string,
    @Body() body: MobileProfileDto,
    @Request() req,
  ) {
    return {
      success: true,
      profile: await this.mobileProfileService.updateByAdmin(mobileUnitId, body, req.user),
    };
  }

  @Delete(':mobileUnitId/avatar')
  @Permissions('manage_sessions')
  @ApiOperation({ summary: 'Quitar foto del perfil movil y eliminar el archivo sin referencias' })
  async removeAvatar(@Param('mobileUnitId') mobileUnitId: string, @Request() req) {
    return {
      success: true,
      profile: await this.avatarRemoval.removeByAdmin(mobileUnitId, req.user),
    };
  }
}

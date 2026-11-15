import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MobileProfileDto } from './dto/mobile-profile.dto';
import { MobileProfileService } from './mobile-profile.service';

@ApiTags('Mobile Profile')
@Controller('mobile/profile')
@UseGuards(AuthGuard('mobile-jwt'))
@ApiBearerAuth()
export class MobileProfileMeController {
  constructor(private readonly mobileProfileService: MobileProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil de emergencia del usuario móvil autenticado' })
  async getMyProfile(@Request() req) {
    const profile = await this.mobileProfileService.getOrCreateForUser(req.user.mobileUserId);
    return { success: true, profile };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar perfil de emergencia del usuario móvil autenticado' })
  async updateMyProfile(@Request() req, @Body() body: MobileProfileDto) {
    const profile = await this.mobileProfileService.updateForUser(req.user.mobileUserId, body);
    return { success: true, profile };
  }
}

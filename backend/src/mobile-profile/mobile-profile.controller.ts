import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MobileUnitService } from '../mobile/mobile-unit.service';
import { MobileProfilePayload, MobileProfileService } from './mobile-profile.service';

@ApiTags('Mobile Profile')
@Controller('mobile/units/:mobileUnitId/profile')
export class MobileProfileController {
  constructor(
    private readonly mobileProfileService: MobileProfileService,
    private readonly mobileUnitService: MobileUnitService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener perfil de emergencia asociado a una unidad movil' })
  async getProfile(
    @Param('mobileUnitId') mobileUnitId: string,
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
  ) {
    await this.mobileUnitService.assertUnitToken(mobileUnitId, mobileUnitToken);
    const profile = await this.mobileProfileService.getOrCreate(mobileUnitId);
    return { success: true, profile };
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar perfil de emergencia asociado a una unidad movil' })
  async updateProfile(
    @Param('mobileUnitId') mobileUnitId: string,
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
    @Body() body: MobileProfilePayload,
  ) {
    await this.mobileUnitService.assertUnitToken(mobileUnitId, mobileUnitToken);
    const profile = await this.mobileProfileService.update(mobileUnitId, body);
    return { success: true, profile };
  }
}

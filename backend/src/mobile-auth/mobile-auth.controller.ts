import { Body, Controller, Get, Headers, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  MobileAcceptLegalDto,
  MobileForgotPasswordDto,
  MobileLoginDto,
  MobileRegisterDto,
  MobileResetPasswordDto,
} from './dto/mobile-auth.dto';
import { MobileAuthService } from './mobile-auth.service';

@ApiTags('Mobile Auth')
@Controller('mobile-auth')
export class MobileAuthController {
  constructor(private readonly mobileAuthService: MobileAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Crear usuario final de app móvil Kids4Safe' })
  async register(
    @Body() body: MobileRegisterDto,
    @Headers('x-mobile-unit-token') mobileUnitToken?: string,
  ) {
    return this.mobileAuthService.register(body, mobileUnitToken);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión como usuario final de app móvil' })
  async login(
    @Body() body: MobileLoginDto,
    @Headers('x-mobile-unit-token') mobileUnitToken?: string,
  ) {
    return this.mobileAuthService.login(body, mobileUnitToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('mobile-jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario móvil autenticado' })
  async me(@Request() req) {
    return this.mobileAuthService.me(req.user.mobileUserId);
  }

  @Patch('legal')
  @UseGuards(AuthGuard('mobile-jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceptar términos y privacidad de app móvil' })
  async acceptLegal(@Request() req, @Body() body: MobileAcceptLegalDto) {
    return this.mobileAuthService.acceptLegal(req.user.mobileUserId, body);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña móvil' })
  async forgotPassword(@Body() body: MobileForgotPasswordDto) {
    return this.mobileAuthService.forgotPassword(body);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña móvil con token' })
  async resetPassword(@Body() body: MobileResetPasswordDto) {
    return this.mobileAuthService.resetPassword(body);
  }
}

import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request,
  Get,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';
import { Permissions } from './decorators/permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';

@ApiTags('🔐 Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    console.log('🔐 [Login Attempt]', { username: loginDto.username, hasPassword: !!loginDto.password });
    return this.authService.login(loginDto);
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('manage_users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar nuevo usuario admin (requiere superadmin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  async getProfile(@Request() req) {
    return this.authService.findById(req.user.userId);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('manage_users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los usuarios (requiere manage_users)' })
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('manage_users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar usuario (requiere manage_users)' })
  async deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }

  @Post('users/:id/toggle')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('manage_users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar/Desactivar usuario (requiere manage_users)' })
  async toggleUserStatus(@Param('id') id: string) {
    return this.authService.toggleUserStatus(id);
  }
}

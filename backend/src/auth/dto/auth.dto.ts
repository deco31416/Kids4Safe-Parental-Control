import { IsString, IsEmail, MinLength, MaxLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username del usuario' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'local-password', description: 'Contraseña del usuario' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'admin', description: 'Username único' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @ApiProperty({ example: 'admin@kids4safe.example', description: 'Email único' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'local-password', description: 'Contraseña fuerte (min 8 caracteres)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'superadmin'], default: 'admin' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ 
    example: ['create_qr', 'delete_qr', 'view_sessions'], 
    description: 'Permisos del usuario',
    required: false 
  })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'Nueva contraseña (min 8 caracteres)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'Nombre del administrador', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiProperty({ description: 'Apellido del administrador', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiProperty({ description: 'Correo del administrador', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

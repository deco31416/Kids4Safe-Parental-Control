import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionsGuard } from './guards/permissions.guard';
import { DatabaseSeederService } from '../database/database-seeder.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        
        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_SECRET no configurado o demasiado corto (mínimo 32 caracteres). '
            + 'Configura JWT_SECRET en .env antes de iniciar.'
          );
        }
        
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionsGuard, DatabaseSeederService],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule, PermissionsGuard],
})
export class AuthModule {}

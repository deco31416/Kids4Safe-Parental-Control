import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { getJwtExpiration } from '../auth/jwt-expiration';
import { MobileUnitModule } from '../mobile/mobile-unit.module';
import { MobileProfileModule } from '../mobile-profile/mobile-profile.module';
import { MobileAuthController } from './mobile-auth.controller';
import { MobileAuthService } from './mobile-auth.service';
import { MobileJwtStrategy } from './mobile-jwt.strategy';
import { MobileUser, MobileUserSchema } from './schemas/mobile-user.schema';

@Module({
  imports: [
    AuditModule,
    MobileProfileModule,
    MobileUnitModule,
    MongooseModule.forFeature([{ name: MobileUser.name, schema: MobileUserSchema }]),
    PassportModule.register({ defaultStrategy: 'mobile-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET no configurado o demasiado corto para mobile-auth.');
        }

        return {
          secret,
          signOptions: {
            expiresIn: getJwtExpiration(configService.get<string>('JWT_EXPIRES_IN')),
          },
        };
      },
    }),
  ],
  controllers: [MobileAuthController],
  providers: [MobileAuthService, MobileJwtStrategy],
  exports: [MobileAuthService],
})
export class MobileAuthModule {}

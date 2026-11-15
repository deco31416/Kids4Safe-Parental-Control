import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MobileAuthService } from './mobile-auth.service';

@Injectable()
export class MobileJwtStrategy extends PassportStrategy(Strategy, 'mobile-jwt') {
  constructor(private readonly mobileAuthService: MobileAuthService) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET no está configurado. Configura JWT_SECRET antes de iniciar.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    if (payload?.type !== 'mobile-user') {
      throw new UnauthorizedException('Token móvil inválido');
    }

    const user = await this.mobileAuthService.validateMobileUser(payload.sub);
    return {
      mobileUserId: payload.sub,
      email: user.email,
      type: 'mobile-user',
    };
  }
}

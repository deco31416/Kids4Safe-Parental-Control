import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error(
        '🔴 CRITICAL: JWT_SECRET no está configurado en variables de entorno. '
        + 'Configura JWT_SECRET en .env antes de iniciar la aplicación.'
      );
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return this.authService.resolveAdminIdentity(payload);
  }
}

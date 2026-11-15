import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { SessionService } from '../session/session.service';

@Injectable()
export class LiveSessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.body?.sessionId;
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 128) {
      throw new UnauthorizedException('Sesión y credencial requeridas');
    }
    const publisherToken = request.headers['x-publisher-session-token'];
    const mobileToken = request.headers['x-mobile-session-token'];
    let session;
    if (typeof publisherToken === 'string' && await this.sessions.validatePublisherSessionToken(sessionId, publisherToken, ['active', 'dropped'])) {
      session = await this.sessions.get(sessionId);
    } else if (typeof mobileToken === 'string') {
      session = await this.sessions.getActiveMobileSession(sessionId, mobileToken);
    }
    if (!session) throw new UnauthorizedException('Credencial de sesión inválida');
    if (request.body.qrId !== undefined && request.body.qrId !== session.qrId) {
      throw new ForbiddenException('El QR no corresponde a la sesión');
    }
    return true;
  }
}

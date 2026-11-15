import { Controller, Get, Header, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../session/session.service';
import { IceServersService } from './ice-servers.service';
import { validateRecorderServiceToken } from '../realtime/recorder-auth';
import { AuthService } from '../auth/auth.service';

@Controller('webrtc')
export class WebrtcController {
  constructor(
    private readonly iceServersService: IceServersService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  private async getAdminIdentity(authorization?: string): Promise<string | null> {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) {
      return null;
    }

    try {
      const identity = await this.authService.verifyAdminToken(token, 'view_sessions');
      return identity.userId;
    } catch {
      return null;
    }
  }

  private async assertIceAccess({
    authorization,
    mobileSessionToken,
    publisherToken,
    recorderServiceToken,
    sessionId,
  }: {
    authorization?: string;
    mobileSessionToken?: string;
    publisherToken?: string;
    recorderServiceToken?: string;
    sessionId?: string;
  }): Promise<string> {
    if (
      sessionId &&
      validateRecorderServiceToken(
        recorderServiceToken,
        this.configService.get<string>('ADMIN_API_KEY'),
      )
    ) {
      return `session:${sessionId}`;
    }

    const adminIdentity = await this.getAdminIdentity(authorization);
    if (adminIdentity) {
      return sessionId ? `session:${sessionId}` : `admin:${adminIdentity}`;
    }

    if (sessionId && mobileSessionToken) {
      const mobileSession = await this.sessionService.getActiveMobileSession(sessionId, mobileSessionToken);
      if (mobileSession) {
        return `session:${sessionId}`;
      }
    }

    if (sessionId && publisherToken) {
      const validPublisher = await this.sessionService.validatePublisherSessionToken(
        sessionId,
        publisherToken,
        ['active', 'paused'],
      );
      if (validPublisher) {
        return `session:${sessionId}`;
      }
    }

    throw new UnauthorizedException('Credenciales WebRTC requeridas');
  }

  @Get('ice-servers')
  @Header('Cache-Control', 'private, max-age=240')
  async getIceServers(
    @Headers('authorization') authorization?: string,
    @Headers('x-mobile-session-token') mobileSessionToken?: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
    @Headers('x-recorder-service-token') recorderServiceToken?: string,
    @Headers('x-session-id') sessionIdHeader?: string,
    @Query('sessionId') sessionIdQuery?: string,
  ) {
    const sessionKey = await this.assertIceAccess({
      authorization,
      mobileSessionToken,
      publisherToken,
      recorderServiceToken,
      sessionId: sessionIdHeader || sessionIdQuery,
    });

    return {
      success: true,
      ...(await this.iceServersService.getIceServers(sessionKey)),
    };
  }
}

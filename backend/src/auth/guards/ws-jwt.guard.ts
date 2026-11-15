import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient();
      const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new WsException('No se proporcionó token de autenticación');
      }

      client.user = await this.authService.verifyAdminToken(token, 'view_sessions');

      return true;
    } catch (error) {
      throw new WsException(error.message || 'Token inválido o expirado');
    }
  }
}

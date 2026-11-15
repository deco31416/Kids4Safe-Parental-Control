import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Interval } from '@nestjs/schedule';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth/auth.service';
import { Server, Socket } from 'socket.io';
import { SessionService } from '../session/session.service';
import { ApiTags, ApiExtraModels } from '@nestjs/swagger';
import { validateCorsOrigin } from '../config/cors-origins';

/**
 * Gateway de WebSocket para streaming en tiempo real
 * 
 * @description
 * Maneja conexiones Socket.io para streaming de:
 * - Cámara (frames de video)
 * - Pantalla (capturas de pantalla)
 * - Audio (chunks de audio)
 * - GPS (ubicación en tiempo real)
 * 
 * @security
 * Requiere token JWT válido con permiso 'view_sessions'
 * 
 * @connection ws://localhost:3001
 * @namespace / (default)
 * @auth Bearer token en handshake.auth.token o headers.authorization
 * 
 * @events
 * Cliente → Servidor:
 * - join-session: Unirse a una sesión (requiere autenticación)
 * - camera-stream: Enviar frame de cámara
 * - screen-stream: Enviar frame de pantalla
 * - audio-stream: Enviar chunk de audio
 * - gps-update: Enviar ubicación GPS
 * - session-heartbeat: Mantener sesión viva
 * 
 * Servidor → Cliente:
 * - camera-frame: Frame de cámara recibido
 * - screen-frame: Frame de pantalla recibido
 * - audio-chunk: Chunk de audio recibido
 * - gps-data: Datos de ubicación
 * - session-error: Error en la sesión
 * - auth-error: Error de autenticación
 * 
 * @see WEBSOCKET-API.md para documentación completa
 */
@ApiTags('📡 Streaming')
@ApiExtraModels()
@WebSocketGateway({
  cors: {
    origin: validateCorsOrigin,
    credentials: true,
  },
})
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private sessions = new Map<string, string>(); // socketId -> sessionId

  constructor(private sessionService: SessionService, private readonly auth: AuthService) {}

  private token(client: Socket) {
    return client.handshake?.auth?.token || client.handshake?.headers?.authorization?.replace('Bearer ', '');
  }

  private async publisherAllowed(client: Socket, sessionId: string) {
    if (!sessionId || client.handshake?.auth?.sessionId !== sessionId) return false;
    const credentials = client.handshake.auth;
    if (typeof credentials.publisherToken === 'string' && await this.sessionService.validatePublisherSessionToken(sessionId, credentials.publisherToken, ['active', 'dropped'])) return true;
    return typeof credentials.mobileSessionToken === 'string' && Boolean(await this.sessionService.getActiveMobileSession(sessionId, credentials.mobileSessionToken));
  }

  private async assertPublisher(client: Socket, sessionId: string) {
    if (this.sessions.get(client.id) !== sessionId || client.data.streamRole !== 'publisher' || !await this.publisherAllowed(client, sessionId)) {
      throw new WsException('Publisher no autorizado para esta sesión');
    }
  }

  @Interval(5000)
  async revalidateViewers() {
    for (const client of this.server?.sockets?.sockets?.values() || []) {
      if (client.data.streamRole !== 'viewer') continue;
      try {
        await this.auth.verifyAdminToken(this.token(client), 'view_sessions');
      } catch {
        client.disconnect(true);
      }
    }
  }

  async handleConnection(client: Socket) {
    console.log(`🔌 Cliente conectando: ${client.id}`);
    
    // Permitir autenticación con sessionId (clientes públicos) o JWT (admins)
    const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.replace('Bearer ', '');
    const sessionId = client.handshake?.auth?.sessionId;
    
    try {
      if (sessionId && await this.publisherAllowed(client, sessionId)) {
        client.data.streamRole = 'publisher';
        return;
      }
      if (!token) throw new Error('Credenciales requeridas');
      (client as any).user = await this.auth.verifyAdminToken(token, 'view_sessions');
      client.data.streamRole = 'viewer';
    } catch {
      console.log(`❌ Cliente ${client.id} rechazado: Sin credenciales`);
      client.emit('auth-error', { 
        message: 'Credencial de sesión o token administrativo válido requerido.',
        code: 'NO_CREDENTIALS'
      });
      client.disconnect();
      return;
    }
    
  }

  handleDisconnect(client: Socket) {
    const sessionId = this.sessions.get(client.id);
    if (sessionId) {
      if (client.data.streamRole === 'publisher') void this.sessionService.pause(sessionId).catch(() => undefined);
      this.sessions.delete(client.id);
    }
    const username = (client as any).user?.username || 'Unknown';
    console.log(`🔌 Cliente desconectado: ${client.id} (${username})`);
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 128) throw new WsException('Sesión inválida');
    if (await this.publisherAllowed(client, sessionId)) {
      client.data.streamRole = 'publisher';
    } else {
      (client as any).user = await this.auth.verifyAdminToken(this.token(client), 'view_sessions');
      client.data.streamRole = 'viewer';
    }
    const previous = this.sessions.get(client.id);
    if (previous && previous !== sessionId) await client.leave(`session-${previous}`);
    const user = (client as any).user;

    console.log(`Cliente autorizado uniéndose a sesión: ${sessionId}`);

    // Unir al cliente a la room de la sesión
    client.join(`session-${sessionId}`);
    this.sessions.set(client.id, sessionId);

    client.emit('session-joined', {
      ok: true,
      sessionId,
      message: `Conectado a la sesión ${sessionId}`,
      user: {
        username: user?.username,
        role: user?.role || 'publisher'
      }
    });

  }

  @SubscribeMessage('camera-stream')
  async handleCameraStream(
    @MessageBody() data: { sessionId: string; frame: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.assertPublisher(client, data.sessionId);
    // Broadcast frame a todos los viewers de la sesión
    this.server.to(`session-${data.sessionId}`).emit('camera-frame', {
      sessionId: data.sessionId,
      frame: data.frame,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('screen-stream')
  async handleScreenStream(
    @MessageBody() data: { sessionId: string; frame: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.assertPublisher(client, data.sessionId);
    this.server.to(`session-${data.sessionId}`).emit('screen-frame', {
      sessionId: data.sessionId,
      frame: data.frame,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('audio-stream')
  async handleAudioStream(
    @MessageBody() data: { sessionId: string; chunk: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.assertPublisher(client, data.sessionId);
    this.server.to(`session-${data.sessionId}`).emit('audio-chunk', {
      sessionId: data.sessionId,
      chunk: data.chunk,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('gps-update')
  async handleGpsUpdate(
    @MessageBody() data: { sessionId: string; location: any },
    @ConnectedSocket() client: Socket,
  ) {
    await this.assertPublisher(client, data.sessionId);
    this.server.to(`session-${data.sessionId}`).emit('gps-data', {
      sessionId: data.sessionId,
      location: data.location,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('session-heartbeat')
  async handleHeartbeat(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.assertPublisher(client, data.sessionId);
    return {
      ok: true,
      timestamp: new Date().toISOString(),
    };
  }
}

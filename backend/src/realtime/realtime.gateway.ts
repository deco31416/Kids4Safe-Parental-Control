import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { ScreenshotsService } from '../screenshots/screenshots.service';
import { AudioClipsService } from '../audio-clips/audio-clips.service';
import { Session, SessionDocument } from '../session/session.schema';
import {
  RTCIceCandidateInit,
  RTCSessionDescriptionInit,
} from './webrtc.types';
import { validateCorsOrigin } from '../config/cors-origins';
import { validateRecorderServiceToken } from './recorder-auth';
import { AuthService } from '../auth/auth.service';
import { Interval } from '@nestjs/schedule';

/**
 * 🎥 Gateway WebRTC Signaling (Meet/Zoom-like)
 * 
 * Este gateway NO transmite video/audio (eso va P2P por WebRTC).
 * Solo coordina la negociación (offer/answer/ICE) entre:
 * - Publisher (usuario en /live/:qrId)
 * - Viewers (admins en /admin/live/:sessionId)
 * 
 * @namespace /realtime
 * @auth Opcional (publisher sin auth, viewers con JWT)
 */

type Role = 'publisher' | 'recorder' | 'subscriber' | 'viewer';

interface RoomState {
  sessionId: string;
  source?: string;
  publisher?: {
    socketId: string;
    connectedAt: number;
  };
  viewers: Map<string, {
    socketId: string;
    username?: string;
    connectedAt: number;
  }>;
  subscribers: Set<string>;
  recorders: Set<string>;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: validateCorsOrigin,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  static readonly ADMIN_NOTIFICATIONS_ROOM = 'authorized-admin-notifications';
  @WebSocketServer()
  server!: Server;

  emitScreenshotConfigUpdated(qrId: string) {
    this.server.emit('screenshot-config-updated', {
      qrId,
      updatedAt: Date.now(),
    });
  }

  constructor(
    private readonly screenshotsService: ScreenshotsService,
    private readonly audioClipsService: AudioClipsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly authService: AuthService,
  ) {}

  // sessionId -> RoomState
  private rooms = new Map<string, RoomState>();

  // socketId -> sessionId (para cleanup)
  private socketToSession = new Map<string, string>();
  private socketToRole = new Map<string, Role>();
  private recorderControlSockets = new Set<string>();

  private rejectJoin(socket: Socket, message: string, code: string) {
    socket.emit('error', { message, code });
    socket.disconnect(true);
  }

  async closeSessionRooms(sessionIds: string[], reason = 'session_replaced') {
    for (const sessionId of sessionIds) {
      const room = this.rooms.get(sessionId);
      if (!room) continue;

      this.server.to(sessionId).emit('session-ended', { sessionId, reason });
      const sockets = await this.server.in(sessionId).fetchSockets();
      for (const socket of sockets) {
        this.socketToSession.delete(socket.id);
        this.socketToRole.delete(socket.id);
        socket.disconnect(true);
      }
      this.rooms.delete(sessionId);
    }
  }

  private validateMobileToken(token: string | undefined, expectedHash: string | undefined) {
    if (!token || !expectedHash) return false;
    const actual = Buffer.from(createHash('sha256').update(token).digest('hex'), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private validateTokenAgainstHashes(token: string | undefined, hashes: Array<string | undefined | null>) {
    if (!token) return false;
    const actual = Buffer.from(createHash('sha256').update(token).digest('hex'), 'hex');

    return hashes.some((hash) => {
      if (!hash) return false;
      const expected = Buffer.from(hash, 'hex');
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    });
  }

  private async validateViewerToken(token: string | undefined) {
    if (!token) return false;
    try {
      await this.authService.verifyAdminToken(token, 'view_sessions');
      return true;
    } catch {
      return false;
    }
  }

  @Interval(5000)
  async revalidateViewers() {
    const sockets = (this.server as unknown as { sockets: Map<string, Socket> })?.sockets;
    for (const socket of sockets?.values() || []) {
      const viewer = this.socketToRole.get(socket.id) === 'viewer';
      if (!viewer && !socket.data.adminNotifications) continue;
      try {
        await this.authService.verifyAdminToken(socket.handshake.auth?.token, viewer ? 'view_sessions' : undefined);
      } catch {
        this.rejectJoin(socket, 'Permiso administrativo revocado o token expirado', 'VIEWER_UNAUTHORIZED');
      }
    }
  }

  private isRecoverablePublisherStatus(status: string | undefined, lastSeen?: Date | string) {
    if (status === 'active') return true;
    if (status !== 'dropped') return false;

    const recoveryMs = Number(this.configService.get('PUBLISHER_DROPPED_RECOVERY_MS', 120_000));
    const safeRecoveryMs = Number.isFinite(recoveryMs) && recoveryMs > 0 ? recoveryMs : 120_000;
    const lastSeenAt = lastSeen ? new Date(lastSeen).getTime() : 0;

    return Number.isFinite(lastSeenAt) && lastSeenAt >= Date.now() - safeRecoveryMs;
  }

  async handleConnection(client: Socket) {
    console.log(`🔌 [Realtime] Cliente conectado: ${client.id}`);
    
    // Permitir autenticación con sessionId (clientes públicos) o JWT (admins)
    const sessionId = client.handshake.auth?.sessionId;
    const token = client.handshake.auth?.token;
    if (token) {
      try {
        await this.authService.verifyAdminToken(token);
        await client.join(RealtimeGateway.ADMIN_NOTIFICATIONS_ROOM);
        client.data.adminNotifications = true;
      } catch {
        this.rejectJoin(client, 'Token administrativo inválido', 'VIEWER_UNAUTHORIZED');
        return;
      }
    }
    
    if (!sessionId && !token) {
      console.warn(`⚠️ [Realtime] Cliente ${client.id} sin credenciales - permitido temporalmente`);
      // No rechazar aún - esperar a que haga join-session
    }
    
    client.emit('connected', { ok: true, socketId: client.id });
  }

  handleDisconnect(client: Socket) {
    this.recorderControlSockets.delete(client.id);
    const sessionId = this.socketToSession.get(client.id);
    
    if (sessionId) {
      const room = this.rooms.get(sessionId);
      
      if (room) {
        // Si era publisher
        if (room.publisher?.socketId === client.id) {
          console.log(`📡 [Realtime] Publisher desconectado: ${sessionId}`);
          room.publisher = undefined;
          
          // Notificar a todos los viewers
          this.server.to(sessionId).emit('publisher-disconnected', { sessionId });
        }
        
        // Si era viewer
        if (room.viewers.has(client.id)) {
          room.viewers.delete(client.id);
          console.log(`👁️ [Realtime] Viewer desconectado de ${sessionId}`);
        }
        
        room.subscribers.delete(client.id);
        room.recorders.delete(client.id);

        // Limpiar room vacía
        if (!room.publisher && room.viewers.size === 0 && room.subscribers.size === 0 && room.recorders.size === 0) {
          this.rooms.delete(sessionId);
          console.log(`🗑️ [Realtime] Room eliminada: ${sessionId}`);
        }
      }
      
      this.socketToSession.delete(client.id);
      this.socketToRole.delete(client.id);
    }
    
    console.log(`🔌 [Realtime] Cliente desconectado: ${client.id}`);
  }

  private isSocketInSession(socket: Socket, sessionId: string) {
    return this.socketToSession.get(socket.id) === sessionId && this.rooms.has(sessionId);
  }

  private rejectEvent(socket: Socket, message: string, code: string) {
    socket.emit('error', { message, code });
  }

  private isPublisher(socket: Socket, sessionId: string) {
    const room = this.rooms.get(sessionId);
    return room?.publisher?.socketId === socket.id && this.socketToRole.get(socket.id) === 'publisher';
  }

  private isViewer(socket: Socket, sessionId: string) {
    const room = this.rooms.get(sessionId);
    return Boolean(room?.viewers.has(socket.id)) && this.socketToRole.get(socket.id) === 'viewer';
  }

  private isRecorder(socket: Socket, sessionId: string) {
    const room = this.rooms.get(sessionId);
    return Boolean(room?.recorders.has(socket.id)) && this.socketToRole.get(socket.id) === 'recorder';
  }

  private async isMediaConsumer(socket: Socket, sessionId: string) {
    return this.isRecorder(socket, sessionId) || (this.isViewer(socket, sessionId) && await this.validateViewerToken(socket.handshake.auth?.token));
  }

  private hasValidRecorderToken(socket: Socket) {
    return validateRecorderServiceToken(
      socket.handshake.auth?.serviceToken,
      this.configService.get<string>('ADMIN_API_KEY'),
    );
  }

  private notifyRecorders(sessionId: string) {
    for (const socketId of this.recorderControlSockets) {
      this.server.to(socketId).emit('recorder-session-start', { sessionId });
    }
  }

  private isSocketTargetInSession(targetSocketId: string, sessionId: string) {
    return this.socketToSession.get(targetSocketId) === sessionId;
  }

  private async touchSession(sessionId: string) {
    await this.sessionModel.updateOne(
      { sessionId, status: { $in: ['active', 'dropped'] } },
      {
        $set: {
          lastSeen: new Date(),
        },
      },
    ).catch((error) => {
      console.warn(`⚠️ [Realtime] No se pudo actualizar lastSeen de ${sessionId}: ${error.message}`);
    });
  }

  @SubscribeMessage('recorder-register')
  async handleRecorderRegister(@ConnectedSocket() socket: Socket) {
    if (!this.hasValidRecorderToken(socket)) {
      this.rejectJoin(socket, 'Credencial interna de recorder invalida', 'RECORDER_UNAUTHORIZED');
      return;
    }

    this.recorderControlSockets.add(socket.id);
    const activeSessions = await this.sessionModel
      .find({ source: 'mobile-app', status: { $in: ['active', 'dropped'] } })
      .select({ sessionId: 1, status: 1, lastSeen: 1 })
      .lean();
    const sessionIds = activeSessions
      .filter((session) => this.isRecoverablePublisherStatus(session.status, session.lastSeen))
      .map((session) => session.sessionId);
    socket.emit('recorder-registered', { sessionIds });
  }

  /**
   * Cliente se une a una sesión
   * - Publisher: el usuario compartiendo cám/mic/pantalla
   * - Viewer: admin viendo el stream
   */
  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string; role: Role; username?: string }
  ) {
    const { sessionId, role, username } = body;
    let sessionSource: string | undefined;

    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 128 || !['publisher', 'recorder', 'subscriber', 'viewer'].includes(role)) {
      socket.emit('error', { message: 'sessionId y role son requeridos' });
      return;
    }

    if (role === 'viewer' && !await this.validateViewerToken(socket.handshake.auth?.token)) {
      this.rejectJoin(socket, 'Token admin invalido o sin permiso para ver sesiones', 'VIEWER_UNAUTHORIZED');
      return;
    }

    const previousSession = this.socketToSession.get(socket.id);
    if (previousSession) {
      if (previousSession !== sessionId || this.socketToRole.get(socket.id) !== role) {
        this.rejectJoin(socket, 'Socket ya unido a otra sesión o rol', 'SOCKET_ALREADY_JOINED');
      } else {
        socket.emit('joined', { sessionId, role });
      }
      return;
    }

    if (role === 'recorder' && !this.hasValidRecorderToken(socket)) {
      this.rejectJoin(socket, 'Credencial interna de recorder invalida', 'RECORDER_UNAUTHORIZED');
      return;
    }

    if (role === 'publisher' || role === 'subscriber' || role === 'recorder') {
      const session = await this.sessionModel
        .findOne({ sessionId })
        .select({ source: 1, status: 1, lastSeen: 1, publisherTokenHash: 1, publisherTokenHashes: 1, 'mobile.sessionTokenHash': 1 })
        .lean();

      if (!session || !this.isRecoverablePublisherStatus(session.status, session.lastSeen)) {
        this.rejectJoin(socket, 'Sesion activa no encontrada', 'SESSION_NOT_ACTIVE');
        return;
      }
      sessionSource = session.source;

      if (role !== 'recorder') {
        const isMobilePublisher = session.source === 'mobile-app';
        const validPublisherToken = isMobilePublisher
          ? this.validateMobileToken(socket.handshake.auth?.mobileSessionToken, session.mobile?.sessionTokenHash)
          : this.validateTokenAgainstHashes(socket.handshake.auth?.publisherToken, [
              session.publisherTokenHash,
              ...(Array.isArray(session.publisherTokenHashes) ? session.publisherTokenHashes : []),
            ]);

        if (!validPublisherToken) {
          const source = isMobilePublisher ? 'movil' : 'web';
          this.rejectJoin(socket, `Token de publisher ${source} invalido`, 'PUBLISHER_UNAUTHORIZED');
          return;
        }
      }
    }

    console.log(`📍 [Realtime] ${role} uniéndose a ${sessionId}`);

    // Unir al room Socket.io
    socket.join(sessionId);
    this.socketToSession.set(socket.id, sessionId);

    // Crear o actualizar room state
    let room = this.rooms.get(sessionId);
    if (!room) {
      room = {
        sessionId,
        source: sessionSource,
        subscribers: new Set(),
        viewers: new Map(),
        recorders: new Set(),
      };
      this.rooms.set(sessionId, room);
    } else if (sessionSource) {
      room.source = sessionSource;
    }

    if (role === 'publisher') {
      // Solo puede haber un publisher
      if (room.publisher) {
        socket.leave(sessionId);
        this.socketToSession.delete(socket.id);
        socket.emit('error', { 
          message: 'Ya existe un publisher en esta sesión',
          code: 'PUBLISHER_EXISTS'
        });
        return;
      }

      room.publisher = {
        socketId: socket.id,
        connectedAt: Date.now(),
      };
      await this.touchSession(sessionId);

      socket.emit('joined', { sessionId, role: 'publisher' });
      this.socketToRole.set(socket.id, 'publisher');

      // Notificar a viewers que el publisher está listo
      this.server.to(sessionId).emit('publisher-ready', { sessionId });
      if (room.source === 'mobile-app') this.notifyRecorders(sessionId);
      
      console.log(`✅ [Realtime] Publisher activo en ${sessionId}`);
    } else if (role === 'subscriber') {
      room.subscribers.add(socket.id);
      socket.emit('joined', { sessionId, role: 'subscriber' });
      this.socketToRole.set(socket.id, 'subscriber');
    } else if (role === 'recorder') {
      room.recorders.add(socket.id);
      socket.emit('joined', { sessionId, role: 'recorder' });
      this.socketToRole.set(socket.id, 'recorder');
      if (room.publisher) socket.emit('publisher-ready', { sessionId });
    } else {
      // Viewer
      room.viewers.set(socket.id, {
        socketId: socket.id,
        username,
        connectedAt: Date.now(),
      });

      socket.emit('joined', { sessionId, role: 'viewer' });
      this.socketToRole.set(socket.id, 'viewer');

      // Si ya hay publisher, avisar al viewer
      if (room.publisher) {
        socket.emit('publisher-ready', { sessionId });
      }

      console.log(`👁️ [Realtime] Viewer activo en ${sessionId} (${room.viewers.size} total)`);
    }
  }

  /**
   * Viewer pide al publisher que cree offer
   */
  @SubscribeMessage('webrtc-start')
  async handleWebRTCStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string }
  ) {
    const { sessionId } = body;
    const room = this.rooms.get(sessionId);

    if (!await this.isMediaConsumer(socket, sessionId)) {
      this.rejectEvent(socket, 'Consumidor no unido a esta sesion', 'CONSUMER_NOT_IN_SESSION');
      return;
    }

    if (!room?.publisher) {
      socket.emit('error', { 
        message: 'Publisher no disponible',
        code: 'NO_PUBLISHER'
      });
      return;
    }

    console.log(`🤝 [Realtime] Negociación iniciada: ${sessionId}`);
    console.log(`📍 [Realtime] Viewer: ${socket.id}`);
    console.log(`📍 [Realtime] Publisher: ${room.publisher.socketId}`);

    // Notificar al publisher que cree offer para este viewer
    this.server.to(room.publisher.socketId).emit('webrtc-create-offer', {
      sessionId,
      viewerSocketId: socket.id,
    });
  }

  /**
   * Publisher envía offer al viewer
   */
  @SubscribeMessage('webrtc-offer')
  async handleWebRTCOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: {
      sessionId: string;
      viewerSocketId: string;
      sdp: RTCSessionDescriptionInit;
    }
  ) {
    const { sessionId, viewerSocketId, sdp } = body;

    const room = this.rooms.get(sessionId);
    if (!this.isPublisher(socket, sessionId)) {
      this.rejectEvent(socket, 'Solo el publisher puede enviar offer para esta sesion', 'PUBLISHER_REQUIRED');
      return;
    }

    const validConsumer = room?.viewers.has(viewerSocketId) || room?.recorders.has(viewerSocketId);
    if (!validConsumer || !this.isSocketTargetInSession(viewerSocketId, sessionId)) {
      this.rejectEvent(socket, 'Viewer destino no pertenece a esta sesion', 'INVALID_VIEWER_TARGET');
      return;
    }

    console.log(`📤 [Realtime] Offer recibida de publisher ${socket.id}`);
    console.log(`📤 [Realtime] Enviando a viewer ${viewerSocketId}`);
    console.log(`📤 [Realtime] SDP type: ${sdp.type}`);

    this.server.to(viewerSocketId).emit('webrtc-offer', {
      sessionId,
      sdp,
      from: socket.id,
    });

    console.log(`✅ [Realtime] Offer enviada`);
  }

  /**
   * Viewer responde con answer al publisher
   */
  @SubscribeMessage('webrtc-answer')
  async handleWebRTCAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: {
      sessionId: string;
      publisherSocketId: string;
      sdp: RTCSessionDescriptionInit;
    }
  ) {
    const { sessionId, publisherSocketId, sdp } = body;

    const room = this.rooms.get(sessionId);
    if (!await this.isMediaConsumer(socket, sessionId)) {
      this.rejectEvent(socket, 'Solo un consumidor unido puede responder WebRTC', 'CONSUMER_REQUIRED');
      return;
    }

    if (room?.publisher?.socketId !== publisherSocketId) {
      this.rejectEvent(socket, 'Publisher destino no pertenece a esta sesion', 'INVALID_PUBLISHER_TARGET');
      return;
    }

    this.server.to(publisherSocketId).emit('webrtc-answer', {
      sessionId,
      sdp,
      from: socket.id,
    });

    console.log(`📥 [Realtime] Answer recibida de viewer`);
  }

  /**
   * ICE candidates (ambos sentidos)
   */
  @SubscribeMessage('webrtc-ice')
  async handleWebRTCICE(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: {
      sessionId: string;
      targetSocketId: string;
      candidate: RTCIceCandidateInit;
    }
  ) {
    const { targetSocketId, candidate, sessionId } = body;

    if (this.isViewer(socket, sessionId) && !await this.validateViewerToken(socket.handshake.auth?.token)) {
      this.rejectJoin(socket, 'Permiso administrativo revocado', 'VIEWER_UNAUTHORIZED');
      return;
    }

    if (!this.isSocketInSession(socket, sessionId)) {
      this.rejectEvent(socket, 'Socket no unido a esta sesion', 'SOCKET_NOT_IN_SESSION');
      return;
    }

    if (!this.isSocketTargetInSession(targetSocketId, sessionId)) {
      this.rejectEvent(socket, 'Socket destino no pertenece a esta sesion', 'INVALID_ICE_TARGET');
      return;
    }

    this.server.to(targetSocketId).emit('webrtc-ice', {
      sessionId,
      candidate,
      from: socket.id,
    });

    // console.log(`🧊 [Realtime] ICE candidate forwarded`);
  }

  /**
   * Publisher notifica cambios en tracks (cam on/off, etc)
   */
  @SubscribeMessage('tracks-update')
  async handleTracksUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: {
      sessionId: string;
      tracks: { camera: boolean; mic: boolean; screen: boolean };
    }
  ) {
    const { sessionId, tracks } = body;

    if (!this.isPublisher(socket, sessionId)) {
      this.rejectEvent(socket, 'Solo el publisher puede actualizar tracks', 'PUBLISHER_REQUIRED');
      return;
    }

    // Broadcast a todos los viewers
    this.server.to(sessionId).emit('tracks-update', { tracks });

    console.log(`🎬 [Realtime] Tracks actualizados:`, tracks);
  }

  /**
   * 📸 Screenshot Capture Handler
   * Recibe capturas desde el publisher y las guarda
   */
  @SubscribeMessage('screen-capture')
  async handleScreenCapture(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: {
      sessionId: string;
      image: string; // base64 data URL
      timestamp: number;
      type?: 'screen' | 'camera';
    }
  ) {
    const { sessionId, image, timestamp, type = 'screen' } = body;

    if (!sessionId || !image) {
      console.error('❌ [Screenshot] Datos incompletos');
      return;
    }

    if (!this.isPublisher(socket, sessionId) && !this.isRecorder(socket, sessionId)) {
      this.rejectEvent(socket, 'Solo el publisher o recorder puede enviar capturas', 'MEDIA_SOURCE_REQUIRED');
      return;
    }

    console.log(`📸 [Screenshot] Captura recibida para sesión ${sessionId} (${type})`);
    await this.touchSession(sessionId);

    try {
      // Guardar en screen-recorder + MongoDB con tipo
      const screenshot = await this.screenshotsService.saveScreenshot(
        sessionId,
        image,
        type,
      );

      // Emitir a los viewers en tiempo real
      this.server.to(sessionId).emit('new-screenshot', {
        sessionId,
        screenshotId: screenshot._id,
        thumbnailUrl: screenshot.thumbnailUrl,
        capturedAt: screenshot.capturedAt,
        type: screenshot.type,
      });

      console.log(`✅ [Screenshot] Guardado correctamente (${type}): ${screenshot._id}`);
    } catch (error) {
      console.error('❌ [Screenshot] Error al guardar:', error);
    }
  }

  /**
   * 🎤 Audio Clip Capture Handler
   * Recibe clips de audio desde el publisher y los guarda
   */
  @SubscribeMessage('audio-capture')
  async handleAudioCapture(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: {
      sessionId: string;
      audio: string; // base64 data URL (data:audio/webm;base64,...)
      timestamp: number;
      duration?: number;
    }
  ) {
    const { sessionId, audio, timestamp, duration } = body;

    if (!sessionId || !audio) {
      console.error('❌ [AudioClip] Datos incompletos');
      return;
    }

    if (!this.isPublisher(socket, sessionId) && !this.isRecorder(socket, sessionId)) {
      this.rejectEvent(socket, 'Solo el publisher o recorder puede enviar audio', 'MEDIA_SOURCE_REQUIRED');
      return;
    }

    console.log(`🎤 [AudioClip] Clip recibido para sesión ${sessionId}`);
    await this.touchSession(sessionId);

    try {
      // Guardar en filesystem + MongoDB
      const audioClip = await this.audioClipsService.saveAudioClip(
        sessionId,
        audio,
      );

      // Emitir a los viewers en tiempo real
      this.server.to(sessionId).emit('new-audio-clip', {
        clipId: audioClip._id,
        url: audioClip.url,
        capturedAt: audioClip.capturedAt,
        duration: audioClip.duration,
      });

      console.log(`✅ [AudioClip] Guardado correctamente: ${audioClip._id}`);
    } catch (error) {
      console.error('❌ [AudioClip] Error al guardar:', error);
    }
  }
}

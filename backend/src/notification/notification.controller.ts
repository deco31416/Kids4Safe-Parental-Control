import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request, Headers, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsArray, IsOptional, IsBoolean, IsIn, ValidateNested, IsUrl, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { SessionService } from '../session/session.service';

const REACTIVATE_TARGETS = ['camera', 'microphone', 'screen', 'location'] as const;
type ReactivateTargetDto = (typeof REACTIVATE_TARGETS)[number];

/**
 * DTO para el contenido de la notificación push
 */
export class PushContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  pdfUrl?: string;

  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @IsOptional()
  @IsString()
  linkText?: string;

  @IsOptional()
  @IsObject()
  customData?: Record<string, any>;

  @IsOptional()
  @IsArray()
  actionButtons?: {
    label: string;
    action: 'open_link' | 'download_pdf' | 'activate_camera' | 'close';
    url?: string;
  }[];
}

/**
 * DTOs para crear notificaciones
 */
export class SendPushNotificationDto {
  @IsString()
  @IsIn(['text', 'image', 'pdf', 'link', 'promotion', 'alert'])
  pushType: 'text' | 'image' | 'pdf' | 'link' | 'promotion' | 'alert';

  @ValidateNested()
  @Type(() => PushContentDto)
  pushContent: PushContentDto;

  @IsArray()
  @IsString({ each: true })
  targetSessions: string[]; // IDs de sesiones que recibirán la notificación

  @IsOptional()
  @IsBoolean()
  reactivateTunnel?: boolean; // Si true, reactiva acceso a cámara/micrófono

  @IsOptional()
  @IsArray()
  @IsIn(REACTIVATE_TARGETS, { each: true })
  reactivateTargets?: ReactivateTargetDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresInSeconds?: number;
}

export class BroadcastPushNotificationDto {
  @IsString()
  @IsIn(['text', 'image', 'pdf', 'link', 'promotion', 'alert'])
  pushType: 'text' | 'image' | 'pdf' | 'link' | 'promotion' | 'alert';

  @ValidateNested()
  @Type(() => PushContentDto)
  pushContent: PushContentDto;

  @IsOptional()
  @IsBoolean()
  reactivateTunnel?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(REACTIVATE_TARGETS, { each: true })
  reactivateTargets?: ReactivateTargetDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresInSeconds?: number;
}

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * ADMIN: Enviar notificación push a usuarios finales
   * POST /notifications/push
   * 
   * Body:
   * {
   *   "pushType": "promotion",
   *   "pushContent": {
   *     "title": "¡Ganaste un vehículo! 🚗",
   *     "body": "Participa en nuestro sorteo",
   *     "imageUrl": "https://example.com/car.jpg",
   *     "linkUrl": "https://example.com/sorteo",
   *     "actionButtons": [
   *       { "label": "Participar", "action": "open_link", "url": "https://..." },
   *       { "label": "Activar Cámara", "action": "activate_camera" }
   *     ]
   *   },
   *   "targetSessions": ["session-123", "session-456"],
   *   "reactivateTunnel": true
   * }
   */
  @Post('push')
  @UseGuards(JwtAuthGuard)
  async sendPushNotification(@Body() dto: SendPushNotificationDto, @Request() req) {
    return this.notificationService.sendPushNotification(
      dto.pushType,
      dto.pushContent,
      dto.targetSessions,
      dto.reactivateTunnel || false,
      dto.reactivateTargets,
      dto.expiresInSeconds,
      req.user.userId,
    );
  }

  /**
   * ADMIN: Enviar push a TODAS las sesiones activas
   * POST /notifications/push/broadcast
   */
  @Post('push/broadcast')
  @UseGuards(JwtAuthGuard)
  async broadcastPushNotification(@Body() dto: BroadcastPushNotificationDto, @Request() req) {
    return this.notificationService.broadcastPushNotification(
      dto.pushType,
      dto.pushContent,
      dto.reactivateTunnel || false,
      dto.reactivateTargets,
      dto.expiresInSeconds,
      req.user.userId,
    );
  }

  /**
   * ADMIN: Obtener notificaciones administrativas (centro de notificaciones)
   * GET /notifications/admin?page=1&limit=50&unreadOnly=true
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard)
  async getAdminNotifications(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('unreadOnly') unreadOnly: string = 'false',
  ) {
    return this.notificationService.getAdminNotifications(
      parseInt(page),
      parseInt(limit),
      unreadOnly === 'true',
    );
  }

  /**
   * ADMIN: Marcar notificación administrativa como leída
   * PATCH /notifications/admin/:id/read
   */
  @Patch('admin/:id/read')
  @UseGuards(JwtAuthGuard)
  async markAdminNotificationAsRead(@Param('id') id: string) {
    return this.notificationService.markAdminNotificationAsRead(id);
  }

  /**
   * ADMIN: Marcar TODAS las notificaciones admin como leídas
   * PATCH /notifications/admin/read-all
   */
  @Patch('admin/read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAdminNotificationsAsRead() {
    return this.notificationService.markAllAdminNotificationsAsRead();
  }

  /**
   * ADMIN: Obtener contador de notificaciones no leídas
   * GET /notifications/admin/unread-count
   */
  @Get('admin/unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount() {
    return this.notificationService.getUnreadCount();
  }

  /**
   * ADMIN: Obtener historial de notificaciones push enviadas
   * GET /notifications/push/history?page=1&limit=50
   */
  @Get('push/history')
  @UseGuards(JwtAuthGuard)
  async getPushHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.notificationService.getPushHistory(parseInt(page), parseInt(limit));
  }

  /**
   * USER: Usuario final reporta que vio la notificación
   * PATCH /notifications/push/:id/seen/:sessionId
   */
  @Patch('push/:id/seen/:sessionId')
  async markPushAsSeen(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileToken?: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    const mobileSession = await this.sessionService.getActiveMobileSession(sessionId, mobileToken);
    const publisherAccepted = mobileSession
      ? false
      : await this.sessionService.validatePublisherSessionToken(
          sessionId,
          publisherToken,
          ['active', 'paused', 'dropped'],
        );
    if (!mobileSession && !publisherAccepted) {
      throw new UnauthorizedException('Token de sesión requerido');
    }
    return this.notificationService.markPushAsSeen(id, sessionId);
  }
}

import { Controller, Get, HttpException, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { TurnUsageService } from './turn-usage.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SessionService } from '../session/session.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MobileUnitService } from '../mobile/mobile-unit.service';
import { ScreenshotsService } from '../screenshots/screenshots.service';
import { AudioClipsService } from '../audio-clips/audio-clips.service';
import { LocationHistoryService } from '../location/location-history.service';
import { RecordingsService } from '../recordings/recordings.service';
import { AudioRecordingService } from '../recordings/audio-recording.service';
import { LocationService } from '../location/location.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly turnUsageService: TurnUsageService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly mobileUnitService: MobileUnitService,
    private readonly screenshotsService: ScreenshotsService,
    private readonly audioClipsService: AudioClipsService,
    private readonly locationHistoryService: LocationHistoryService,
    private readonly recordingsService: RecordingsService,
    private readonly audioRecordingService: AudioRecordingService,
    private readonly locationService: LocationService,
  ) {}

  @Get('turn/usage')
  @Permissions('view_sessions')
  async getTurnUsage() {
    return {
      success: true,
      turn: await this.turnUsageService.getMeteredUsage(),
    };
  }

  @Get('turn/history')
  @Permissions('view_sessions')
  async getTurnHistory(@Query('limit') limit?: string) {
    return {
      success: true,
      history: await this.turnUsageService.getHistory(Number(limit || 48)),
    };
  }

  @Get('mobile/units')
  @Permissions('view_sessions')
  async getMobileUnits(@Query('limit') limit?: string) {
    return {
      success: true,
      units: await this.mobileUnitService.listForAdmin(Number(limit || 100)),
    };
  }

  @Get('mobile/emergencies/recent')
  @Permissions('view_sessions')
  async getRecentMobileEmergencies(@Query('limit') limit?: string) {
    return {
      success: true,
      emergencies: await this.sessionService.getRecentMobileEmergencies(limit || 50),
    };
  }

  @Get('frontend/sessions/recent')
  @Permissions('view_sessions')
  async getRecentFrontendSessions(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('qrId') qrId?: string,
  ) {
    return {
      success: true,
      ...(await this.sessionService.getRecentFrontendSessions({ limit, cursor, qrId })),
    };
  }

  @Post('session/:sessionId/end')
  @Permissions('manage_sessions')
  async endSessionAsAdmin(@Param('sessionId') sessionId: string) {
    try {
      let session: Awaited<ReturnType<SessionService['complete']>> | null = null;
      try {
        session = await this.sessionService.complete(sessionId);
      } catch (error: any) {
        if (error?.message !== 'Session not found') throw error;
      }
      await this.realtimeGateway.closeSessionRooms([sessionId], 'admin_session_ended');
      this.audioRecordingService.clearBuffers(sessionId);

      await this.auditService.log({
        eventType: 'SESSION_ENDED_BY_ADMIN',
        actorType: 'admin',
        sessionId,
        qrId: session?.qrId,
        severity: 'warning',
        metadata: { sessionAlreadyMissing: !session },
      });

      const [screenshotsDeleted, audioClipsDeleted, locationsDeleted, recordingsDeleted, trackedLocationsDeleted] = await Promise.all([
        this.screenshotsService.deleteSessionScreenshots(sessionId),
        this.audioClipsService.deleteSessionAudioClips(sessionId),
        this.locationHistoryService.deleteSessionHistory(sessionId),
        this.recordingsService.deleteSession(sessionId),
        this.locationService.deleteRoute(sessionId),
      ]);
      const sessionRecordsDeleted = await this.sessionService.deleteSessionRecord(sessionId);

      await this.auditService.log({
        eventType: 'SESSION_EVIDENCE_DELETED_BY_ADMIN',
        actorType: 'admin',
        sessionId,
        qrId: session?.qrId,
        severity: 'critical',
        metadata: {
          screenshotsDeleted,
          audioClipsDeleted,
          locationsDeleted,
          trackedLocationsDeleted,
          sessionRecordsDeleted,
          recordingsDeleted: recordingsDeleted.deletedCount,
        },
      } as any);

      return {
        success: true,
        sessionId,
        status: 'deleted',
        deleted: {
          screenshots: screenshotsDeleted,
          audioClips: audioClipsDeleted,
          locations: locationsDeleted + trackedLocationsDeleted,
          sessions: sessionRecordsDeleted,
          recordings: recordingsDeleted.deletedCount,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Error al cerrar y eliminar sesión',
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /admin/location/route/:sessionId
   * Obtiene ruta completa de una sesión (todos los puntos)
   * 
   * Para dibujar polyline en mapa
   */
  @Get('location/route/:sessionId')
  @Permissions('view_sessions')
  async getRoute(@Param('sessionId') sessionId: string) {
    return this.adminService.getRoute(sessionId);
  }

  /**
   * GET /admin/location/stats/:sessionId
   * Estadísticas de ruta:
   * - Distancia recorrida (metros/km)
   * - Duración (segundos/minutos)
   * - Velocidad promedio (km/h)
   */
  @Get('location/stats/:sessionId')
  @Permissions('view_sessions')
  async getStats(@Param('sessionId') sessionId: string) {
    return this.adminService.getStats(sessionId);
  }

  /**
   * GET /admin/location/export/:sessionId
   * Export ruta en formato GeoJSON o CSV
   * 
   * Query params:
   * - format: geojson | csv (default: geojson)
   */
  @Get('location/export/:sessionId')
  @Permissions('export_reports')
  async exportRoute(
    @Param('sessionId') sessionId: string,
    @Query('format') format?: 'geojson' | 'csv',
  ) {
    return this.adminService.exportRoute(sessionId, format || 'geojson');
  }

  /**
   * GET /admin/session/:sessionId/summary
   * Resumen completo de sesión para dashboard
   */
  @Get('session/:sessionId/summary')
  @Permissions('view_sessions')
  async getSessionSummary(@Param('sessionId') sessionId: string) {
    return this.adminService.getSessionSummary(sessionId);
  }
}

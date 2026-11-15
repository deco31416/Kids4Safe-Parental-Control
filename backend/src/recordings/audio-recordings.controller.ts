import { Body, Controller, Get, Headers, Post, UnauthorizedException, ForbiddenException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SessionService } from '../session/session.service';
import { AudioChunk, AudioRecordingService } from './audio-recording.service';

@ApiTags('🎤 Grabaciones de audio')
@Controller('recordings/audio')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AudioRecordingsController {
  constructor(
    private readonly audio: AudioRecordingService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post('chunk')
  async chunk(@Body() chunk: AudioChunk, @Headers('x-publisher-session-token') token?: string) {
    await this.assertPublisher(chunk.sessionId, token, chunk.qrId);
    await this.audio.processAudioChunk(chunk);
    return { success: true };
  }

  @Public()
  @Post('finish')
  async finish(
    @Body() body: { sessionId: string; qrId: string },
    @Headers('x-publisher-session-token') token?: string,
  ) {
    await this.assertPublisher(body.sessionId, token, body.qrId);
    const url = await this.audio.finishRecording(body.sessionId, body.qrId);
    return url
      ? { success: true, cloudinaryUrl: url, storageUrl: url, message: 'Audio guardado exitosamente' }
      : { success: false, message: 'No hay audio para guardar' };
  }

  @Get('stats')
  @Permissions('view_recordings')
  stats() { return { success: true, stats: this.audio.getBufferStats() }; }

  private async assertPublisher(sessionId: string, token?: string, qrId?: string) {
    if (!await this.sessions.validatePublisherSessionToken(sessionId, token)) {
      throw new UnauthorizedException('Publisher token inválido o ausente');
    }
    const session = await this.sessions.get(sessionId);
    if (!session || session.qrId !== qrId) throw new ForbiddenException('El QR no corresponde a la sesión');
  }
}

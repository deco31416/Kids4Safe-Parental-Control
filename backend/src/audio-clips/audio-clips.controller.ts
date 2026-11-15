import { Controller, Get, Param, UseGuards, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AudioClipsService } from './audio-clips.service';

@ApiTags('Audio Clips')
@Controller('audio-clips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AudioClipsController {
  constructor(private readonly audioClipsService: AudioClipsService) {}

  @Get('session/:sessionId')
  @Permissions('view_recordings', 'view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener audio clips de una sesión' })
  async getSessionAudioClips(@Param('sessionId') sessionId: string) {
    console.log(`🎤 [Controller] Buscando audio clips para sesión: ${sessionId}`);
    
    const clips = await this.audioClipsService.getSessionAudioClips(sessionId);
    
    console.log(`🎤 [Controller] Audio clips encontrados: ${clips.length}`);
    
    return {
      success: true,
      count: clips.length,
      clips: clips.map((c) => ({
        id: c._id,
        url: c.url,
        capturedAt: c.capturedAt,
        duration: c.duration,
        sizeBytes: c.sizeBytes,
      })),
    };
  }

  @Get('debug/:sessionId')
  @Permissions('view_recordings', 'view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug - Obtener audio clips' })
  async debugGetAudioClips(@Param('sessionId') sessionId: string) {
    console.log(`🐛 [DEBUG] Buscando audio clips para: ${sessionId}`);
    const clips = await this.audioClipsService.getSessionAudioClips(sessionId);
    console.log(`🐛 [DEBUG] Encontrados: ${clips.length}`);
    
    return {
      success: true,
      count: clips.length,
      clips: clips.map((c) => ({
        id: c._id,
        url: c.url,
        capturedAt: c.capturedAt,
        duration: c.duration,
        sizeBytes: c.sizeBytes,
      })),
    };
  }

  @Delete(':id')
  @Permissions('delete_recordings', 'manage_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un audio clip' })
  async deleteAudioClip(@Param('id') id: string) {
    const deleted = await this.audioClipsService.deleteAudioClip(id);
    return {
      success: deleted,
      message: deleted ? 'Audio clip eliminado' : 'Audio clip no encontrado',
    };
  }

  @Delete('batch/multiple')
  @Permissions('delete_recordings', 'manage_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar múltiples audio clips' })
  async deleteMultipleAudioClips(@Body() body: { ids: string[] }) {
    const deletedCount = await this.audioClipsService.deleteMultipleAudioClips(body.ids);
    return {
      success: true,
      deletedCount,
      message: `${deletedCount} audio clips eliminados`,
    };
  }

  @Delete('session/:sessionId/all')
  @Permissions('delete_recordings', 'manage_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar todos los audio clips de una sesión' })
  async deleteSessionAudioClips(@Param('sessionId') sessionId: string) {
    const deletedCount = await this.audioClipsService.deleteSessionAudioClips(sessionId);
    return {
      success: true,
      deletedCount,
      message: `${deletedCount} audio clips eliminados de la sesión`,
    };
  }
}

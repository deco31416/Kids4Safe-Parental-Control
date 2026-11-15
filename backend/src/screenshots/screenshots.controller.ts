import { Controller, Get, Param, UseGuards, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ScreenshotsService } from './screenshots.service';

@ApiTags('Screenshots')
@Controller('screenshots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ScreenshotsController {
  constructor(private readonly screenshotsService: ScreenshotsService) {}

  @Get('session/:sessionId')
  @Permissions('view_recordings', 'view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener capturas de una sesión' })
  async getSessionScreenshots(@Param('sessionId') sessionId: string) {
    console.log(`📸 [Controller] Buscando capturas para sesión: ${sessionId}`);
    
    const screenshots =
      await this.screenshotsService.getSessionScreenshots(sessionId);
    
    console.log(`📸 [Controller] Capturas encontradas: ${screenshots.length}`);
    
    return {
      success: true,
      count: screenshots.length,
      screenshots: screenshots.map((s) => ({
        id: s._id,
        url: s.url,
        thumbnailUrl: s.thumbnailUrl,
        capturedAt: s.capturedAt,
        type: (s as any).type,
      })),
    };
  }

  @Get('debug/:sessionId')
  @Permissions('view_recordings', 'view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug - Obtener capturas' })
  async debugGetScreenshots(@Param('sessionId') sessionId: string) {
    console.log(`🐛 [DEBUG] Buscando capturas para: ${sessionId}`);
    const screenshots = await this.screenshotsService.getSessionScreenshots(sessionId);
    console.log(`🐛 [DEBUG] Encontradas: ${screenshots.length}`);
    
    return {
      success: true,
      count: screenshots.length,
      screenshots: screenshots.map((s) => ({
        id: s._id,
        url: s.url,
        thumbnailUrl: s.thumbnailUrl,
        capturedAt: s.capturedAt,
        type: (s as any).type,
      })),
    };
  }

  @Delete(':id')
  @Permissions('delete_recordings', 'manage_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un screenshot' })
  async deleteScreenshot(@Param('id') id: string) {
    const deleted = await this.screenshotsService.deleteScreenshot(id);
    return {
      success: deleted,
      message: deleted ? 'Screenshot eliminado' : 'Screenshot no encontrado',
    };
  }

  @Delete('batch/multiple')
  @Permissions('delete_recordings', 'manage_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar múltiples screenshots' })
  async deleteMultipleScreenshots(@Body() body: { ids: string[] }) {
    const deletedCount = await this.screenshotsService.deleteMultipleScreenshots(body.ids);
    return {
      success: true,
      deletedCount,
      message: `${deletedCount} screenshots eliminados`,
    };
  }

  @Delete('session/:sessionId/all')
  @Permissions('delete_recordings', 'manage_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar todas las capturas de una sesión' })
  async deleteSessionScreenshots(@Param('sessionId') sessionId: string) {
    const deletedCount = await this.screenshotsService.deleteSessionScreenshots(sessionId);
    return {
      success: true,
      deletedCount,
      message: `${deletedCount} screenshots de la sesión eliminados`,
    };
  }

  @Get('session/:sessionId/latest')
  @Permissions('view_recordings', 'view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener última captura de una sesión' })
  async getLatestScreenshot(@Param('sessionId') sessionId: string) {
    const screenshot =
      await this.screenshotsService.getLatestScreenshot(sessionId);
    
    if (!screenshot) {
      return { success: true, screenshot: null };
    }

    return {
      success: true,
      screenshot: {
        id: screenshot._id,
        url: screenshot.url,
        thumbnailUrl: screenshot.thumbnailUrl,
        capturedAt: screenshot.capturedAt,
      },
    };
  }
}

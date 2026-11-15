import { Controller, Get, Post, Query, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService, AuditLogFilters } from './audit.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('📋 Auditoría')
@Controller('audit')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Get('logs')
  @Permissions('view_audit')
  @ApiOperation({ summary: 'Buscar logs de auditoría (requiere view_audit)' })
  async getLogs(@Query() query: AuditLogFilters) {
    return this.auditService.find(query);
  }

  @Get('session/:id')
  @Permissions('view_audit')
  @ApiOperation({ summary: 'Timeline completo de una sesión' })
  async getSessionTimeline(@Param('id') sessionId: string) {
    const logs = await this.auditService.getSessionTimeline(sessionId);
    return { success: true, logs, total: logs.length };
  }

  @Get('qr/:id')
  @Permissions('view_audit')
  @ApiOperation({ summary: 'Logs de un QR específico' })
  async getQRLogs(
    @Param('id') qrId: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.auditService.getQRLogs(
      qrId,
      limit ? parseInt(limit) : 50,
    );
    return { success: true, logs, total: logs.length };
  }

  @Post('export-pdf/:sessionId')
  @Permissions('export_reports')
  @ApiOperation({ 
    summary: 'Exportar sesión a PDF ISO 19115 (requiere export_reports)',
    description: 'Genera PDF con timeline, GPS, media metadata y cadena de custodia SHA-256. Retorna URL firmada del volumen.'
  })
  async exportSessionPDF(@Param('sessionId') sessionId: string) {
    try {
      const pdfUrl = await this.pdfGeneratorService.generateSessionReport(sessionId);
      return {
        success: true,
        pdfUrl,
        expiresIn: '7 days',
        message: 'PDF generado exitosamente. URL válida por 7 días.',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Error generando PDF: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @Permissions('view_audit')
  @ApiOperation({ summary: 'Estadísticas de auditoría' })
  async getStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.getStats({ from, to });
  }
}

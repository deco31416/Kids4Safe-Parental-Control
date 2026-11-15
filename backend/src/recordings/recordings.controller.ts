import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FinishRecordingDto, RecordingsService } from './recordings.service';

@ApiTags('🎬 Grabaciones')
@Controller('recordings')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class RecordingsController {
  constructor(private readonly recordings: RecordingsService) {}

  @Post('init')
  @Permissions('record_sessions')
  @ApiOperation({ summary: 'Preparar subida al volumen del backend' })
  init(@Body() body: { sessionId: string }) {
    return { success: true, storage: this.recordings.init(body.sessionId) };
  }

  @Post('upload')
  @Permissions('record_sessions')
  @ApiOperation({ summary: 'Subir video por streaming al volumen' })
  async upload(
    @Req() request: any,
    @Query('sessionId') sessionId: string,
    @Query('qrId') qrId: string,
    @Query('format') format = 'webm',
  ) {
    const contentType = String(request.headers['content-type'] || 'video/webm').split(';')[0];
    const recording = await this.recordings.upload(request, { contentType, format, qrId, sessionId });
    return { success: true, recording };
  }

  @Post('finish')
  @Permissions('record_sessions')
  async finish(@Body() dto: FinishRecordingDto) {
    return { success: true, recording: await this.recordings.finish(dto) };
  }

  @Get('session/:id')
  @Permissions('view_recordings', 'view_sessions')
  async getBySession(@Param('id') sessionId: string) {
    const recordings = await this.recordings.getBySession(sessionId);
    return { success: true, recordings, total: recordings.length };
  }

  @Get('qr/:id')
  @Permissions('view_recordings', 'view_sessions')
  async getByQR(@Param('id') qrId: string, @Query('limit') limit?: string) {
    const recordings = await this.recordings.getByQR(qrId, limit ? parseInt(limit) : 20);
    return { success: true, recordings, total: recordings.length };
  }

  @Get('all')
  @Permissions('view_recordings', 'view_sessions')
  getAll(@Query('limit') limit?: string, @Query('skip') skip?: string) {
    return this.recordings.getAll(limit ? parseInt(limit) : 50, skip ? parseInt(skip) : 0);
  }

  @Delete('batch/multiple')
  @Permissions('delete_recordings', 'manage_sessions')
  async deleteMany(@Body() body: { ids?: string[] }) {
    if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 100) {
      throw new BadRequestException('ids debe contener entre 1 y 100 grabaciones');
    }
    if (body.ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
      throw new BadRequestException('Todos los ids deben ser ObjectId válidos');
    }
    return { success: true, ...(await this.recordings.deleteMany(body.ids)) };
  }

  @Delete('session/:id/all')
  @Permissions('delete_recordings', 'manage_sessions')
  async deleteSession(@Param('id') sessionId: string) {
    return { success: true, ...(await this.recordings.deleteSession(sessionId)) };
  }

  @Delete(':id')
  @Permissions('delete_recordings', 'manage_sessions')
  async delete(@Param('id') id: string) {
    if (!/^[a-f\d]{24}$/i.test(id)) throw new BadRequestException('ID de grabación inválido');
    return { success: await this.recordings.delete(id) };
  }
}

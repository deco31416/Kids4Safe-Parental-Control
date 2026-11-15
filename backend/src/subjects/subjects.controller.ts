import { Body, Controller, Delete, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UpsertSessionSubjectDto } from './dto/subject.dto';
import { SubjectsService } from './subjects.service';
import { SubjectPhotoRemovalService } from './subject-photo-removal.service';

@ApiTags('Identidades QR/Link')
@Controller('admin/subjects')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class SubjectsController {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly photoRemoval: SubjectPhotoRemovalService,
  ) {}

  @Get()
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Listar identidades asignadas a sesiones QR/link' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return {
      success: true,
      ...(await this.subjectsService.list({ page, limit, search })),
    };
  }

  @Patch(':subjectId')
  @Permissions('manage_sessions')
  @ApiOperation({ summary: 'Actualizar ficha de identidad QR/link desde el panel' })
  async updateSubject(
    @Param('subjectId') subjectId: string,
    @Body() body: UpsertSessionSubjectDto,
    @Request() req,
  ) {
    return {
      success: true,
      subject: await this.subjectsService.updateSubject(subjectId, body, req.user),
    };
  }

  @Delete(':subjectId/photo')
  @Permissions('manage_sessions')
  @ApiOperation({ summary: 'Quitar foto de identidad QR/link y eliminar el archivo local' })
  async removePhoto(@Param('subjectId') subjectId: string, @Request() req) {
    return { success: true, subject: await this.photoRemoval.remove(subjectId, req.user) };
  }

  @Get('session/:sessionId')
  @Permissions('view_sessions')
  @ApiOperation({ summary: 'Obtener identidad asignada a una sesion QR/link' })
  async getForSession(@Param('sessionId') sessionId: string) {
    return {
      success: true,
      ...(await this.subjectsService.getForSession(sessionId)),
    };
  }

  @Patch('session/:sessionId')
  @Permissions('manage_sessions')
  @ApiOperation({ summary: 'Crear o actualizar identidad asignada a una sesion QR/link' })
  async upsertForSession(
    @Param('sessionId') sessionId: string,
    @Body() body: UpsertSessionSubjectDto,
    @Request() req,
  ) {
    return {
      success: true,
      ...(await this.subjectsService.upsertForSession(sessionId, body, req.user)),
    };
  }
}

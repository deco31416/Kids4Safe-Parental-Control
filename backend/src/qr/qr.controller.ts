import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Param, 
  Body,
  Query,
  HttpException, 
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QRService } from './qr.service';
import { PolicyService } from './policy.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@ApiTags('📱 QR Codes')
@Controller('qr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class QRController {
  constructor(
    private readonly qrService: QRService,
    private readonly policyService: PolicyService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Post('create')
  @Permissions('create_qr')
  @ApiOperation({ summary: 'Crear nuevo QR code (requiere create_qr)' })
  @ApiResponse({ status: 201, description: 'QR creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() body: { 
    name: string; 
    createdBy?: string;
    config?: any;
    policies?: any;
  }) {
    if (!body.name) {
      throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
    }

    const destinationUrl =
      body.config?.redirect_url ||
      body.config?.destinationUrl ||
      body.config?.redirectUrl;
    if (!destinationUrl) {
      throw new HttpException('Destination URL is required', HttpStatus.BAD_REQUEST);
    }

    try {
      new URL(destinationUrl);
    } catch {
      throw new HttpException('Destination URL is invalid', HttpStatus.BAD_REQUEST);
    }

    const qr = await this.qrService.create(
      body.name, 
      body.createdBy,
      {
        ...body.config,
        redirect_url: destinationUrl,
      },
      body.policies
    );
    return {
      success: true,
      qr,
    };
  }

  @Get('all')
  @Permissions('view_qr')
  @ApiOperation({ summary: 'Obtener todos los QR codes (requiere view_qr)' })
  @ApiResponse({ status: 200, description: 'Lista de QR codes' })
  async getAll() {
    const qrs = await this.qrService.getAll();
    
    // ✅ Actualizar contador de sesiones activas para cada QR antes de retornar
    for (const qr of qrs) {
      await this.qrService.updateActiveSessions(qr.id);
    }
    
    // Obtener QRs actualizados
    const updatedQrs = await this.qrService.getAll();
    
    // 🔄 Mapear isActive → status para todos los QRs
    const qrsWithStatus = updatedQrs.map(qr => {
      const status = !qr.isActive 
        ? 'paused' 
        : (qr.expiresAt && qr.expiresAt < Date.now()) 
          ? 'expired' 
          : 'active';
      return { ...qr, status };
    });
    
    return { success: true, qrs: qrsWithStatus };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener QR por ID (público para validación)' })
  @ApiResponse({ status: 200, description: 'QR encontrado' })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  async get(@Param('id') id: string) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }
    
    // 🔄 Mapear isActive → status para compatibilidad con Admin Panel
    const status = !qr.isActive 
      ? 'paused' 
      : (qr.expiresAt && qr.expiresAt < Date.now()) 
        ? 'expired' 
        : 'active';
    
    return { success: true, qr: { ...qr, status } };
  }

  @Public()
  @Get(':id/config')
  @ApiOperation({ summary: 'Obtener configuración de Session Gated Content (público)' })
  @ApiResponse({ status: 200, description: 'Configuración obtenida' })
  async getConfig(@Param('id') id: string) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }
    return { 
      success: true, 
      config: qr.config || {},
      policies: qr.policies || {}
    };
  }

  @Get(':id/sessions')
  @Permissions('view_qr')
  @ApiOperation({ summary: 'Obtener sesiones de un QR (requiere view_qr)' })
  @ApiResponse({ status: 200, description: 'Lista de sesiones' })
  async getSessions(@Param('id') id: string, @Query('limit') limit?: string) {
    const sessions = await this.qrService.getSessionSummariesByQR(id, limit || 100);
    return { success: true, sessions, total: sessions.length };
  }

  @Post(':id/toggle')
  @Permissions('edit_qr')
  @ApiOperation({ summary: 'Activar/Desactivar QR (requiere edit_qr)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  async toggle(@Param('id') id: string) {
    const qr = await this.qrService.toggleActive(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }
    
    // 🔄 Mapear isActive → status
    const status = !qr.isActive 
      ? 'paused' 
      : (qr.expiresAt && qr.expiresAt < Date.now()) 
        ? 'expired' 
        : 'active';
    
    return { success: true, qr: { ...qr, status } };
  }

  @Delete(':id')
  @Permissions('delete_qr')
  @ApiOperation({ summary: 'Eliminar QR (requiere delete_qr)' })
  @ApiResponse({ status: 200, description: 'QR eliminado' })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  async delete(@Param('id') id: string) {
    await this.qrService.delete(id);
    return { success: true, message: 'QR deleted successfully' };
  }

  @Public()
  @Post(':id/validate-session')
  @ApiOperation({ summary: 'Validar si una sesión cumple las políticas del QR (público)' })
  @ApiResponse({ status: 200, description: 'Resultado de validación' })
  async validateSession(@Param('id') id: string, @Body() sessionData: any) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }

    const validation = this.policyService.validateSession(qr, sessionData);
    return { success: true, validation };
  }

  @Public()
  @Post(':id/validate-permissions')
  @ApiOperation({ summary: 'Validar permisos requeridos (público)' })
  @ApiResponse({ status: 200, description: 'Resultado de validación de permisos' })
  async validatePermissions(@Param('id') id: string, @Body() body: { permissions: any }) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }

    const validation = this.policyService.validateRequiredPermissions(qr, body.permissions);
    return { success: true, validation };
  }

  @Public()
  @Get(':id/permission-config')
  @ApiOperation({ summary: 'Obtener configuración de permisos requeridos (público)' })
  @ApiResponse({ status: 200, description: 'Configuración de permisos' })
  async getPermissionConfig(@Param('id') id: string) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }

    const config = this.policyService.getPermissionConfig(qr);
    return { success: true, config };
  }

  @Post(':id/screenshot-config')
  @Permissions('edit_qr')
  @ApiOperation({ summary: 'Actualizar configuración de capturas automáticas' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  async updateScreenshotConfig(
    @Param('id') id: string,
    @Body() config: {
      captureScreen: boolean;
      captureCamera: boolean;
      screenInterval: number;
      cameraInterval: number;
    }
  ) {
    const qr = await this.qrService.get(id);
    const normalizedConfig = {
      captureScreen: !!config.captureScreen,
      captureCamera: !!config.captureCamera,
      screenInterval: Number(config.screenInterval || 15),
      cameraInterval: Number(config.cameraInterval || 15),
      maxPerSession: 500,
    };

    // Fallback store (útil en local si Redis perdió el QR)
    await this.qrService.setStandaloneScreenshotConfig(id, normalizedConfig);

    // Si el QR existe, también persistir dentro de qr.config
    if (qr) {
      qr.config = qr.config || {};
      qr.config.screenshotConfig = normalizedConfig;
      await this.qrService.update(id, qr);
    }

    // Notificar a clientes conectados (publisher) para aplicar cambios al instante
    this.realtimeGateway.emitScreenshotConfigUpdated(id);
    return {
      success: true,
      message: 'Configuración de capturas actualizada',
      config: normalizedConfig,
    };
  }

  @Public()
  @Get(':id/screenshot-config')
  @ApiOperation({ summary: 'Obtener configuración de capturas (público)' })
  @ApiResponse({ status: 200, description: 'Configuración de capturas' })
  async getScreenshotConfig(@Param('id') id: string) {
    const qr = await this.qrService.get(id);

    // Configuración por defecto si no existe
    const defaultConfig = {
      captureScreen: true,
      captureCamera: true,
      screenInterval: 15,
      cameraInterval: 15,
      maxPerSession: 500,
    };

    // 1) Preferir la config embebida en el QR
    const embedded = qr?.config?.screenshotConfig;
    if (embedded) {
      return { success: true, config: embedded };
    }

    // 2) Fallback store (si el QR se perdió, pero la config existe)
    const standalone = await this.qrService.getStandaloneScreenshotConfig(id);
    if (standalone) {
      return { success: true, config: standalone };
    }

    return {
      success: true,
      config: defaultConfig,
    };
  }

  // ========================================================================
  // 🎬 PHASE 6: CAPTURE POLICY ENDPOINTS
  // ========================================================================

  @Public()
  @Get(':id/capture-policy')
  @ApiOperation({ summary: 'Obtener Capture Policy del QR (público)' })
  @ApiResponse({ status: 200, description: 'Capture Policy obtenida' })
  async getCapturePolicy(@Param('id') id: string) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }

    // Política por defecto si no está configurada
    const defaultPolicy = {
      intervals: {
        camera: 15000,
        screen: 15000,
        microphone: 15000,
        gps: 30000,
      },
      onlyIfChanged: true,
      changeThresholds: {
        gpsMeters: 10,
        imageDiffPercent: 5,
        audioLevelDelta: 10,
      },
      policyPreset: 'default',
    };

    return {
      success: true,
      capturePolicy: qr.config?.capturePolicy || defaultPolicy,
      deviceType: null, // Cliente enviará su device type para obtener intervalos específicos
    };
  }

  @Post(':id/capture-policy')
  @Permissions('edit_qr')
  @ApiOperation({ summary: 'Actualizar Capture Policy del QR (requiere edit_qr)' })
  @ApiResponse({ status: 200, description: 'Capture Policy actualizada' })
  async updateCapturePolicy(
    @Param('id') id: string,
    @Body() body: {
      intervals?: {
        camera?: number;
        screen?: number;
        microphone?: number;
        gps?: number;
      };
      onlyIfChanged?: boolean;
      changeThresholds?: {
        gpsMeters?: number;
        imageDiffPercent?: number;
        audioLevelDelta?: number;
      };
      perDeviceOverrides?: any;
      policyPreset?: 'default' | 'high-frequency' | 'low-power' | 'custom';
    }
  ) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }

    // Actualizar capture policy
    const updatedQR = await this.qrService.updateCapturePolicy(id, body);

    return {
      success: true,
      message: 'Capture policy updated successfully',
      capturePolicy: updatedQR.config?.capturePolicy,
    };
  }

  @Get(':id/capture-policy/effective/:deviceType')
  @Public()
  @ApiOperation({ summary: 'Obtener intervalos efectivos según device type (público)' })
  @ApiResponse({ status: 200, description: 'Intervalos efectivos calculados' })
  async getEffectiveIntervals(
    @Param('id') id: string,
    @Param('deviceType') deviceType: 'mobile' | 'tablet' | 'desktop' | 'laptop'
  ) {
    const qr = await this.qrService.get(id);
    if (!qr) {
      throw new HttpException('QR not found', HttpStatus.NOT_FOUND);
    }

    const policy = qr.config?.capturePolicy;
    if (!policy) {
      // Retornar defaults si no hay política configurada
      const baseDefaults = {
        camera: 15000,
        screen: 15000,
        microphone: 15000,
        gps: 30000,
      };

      // Aplicar defaults por device type
      const effectiveIntervals = { ...baseDefaults };
      if (deviceType === 'mobile') {
        effectiveIntervals.camera = 30000;
        effectiveIntervals.gps = 45000;
      } else if (deviceType === 'desktop' || deviceType === 'laptop') {
        effectiveIntervals.camera = 10000;
        effectiveIntervals.screen = 10000;
        effectiveIntervals.gps = 60000;
      }

      return {
        success: true,
        deviceType,
        effectiveIntervals,
        onlyIfChanged: true,
        changeThresholds: {
          gpsMeters: 10,
          imageDiffPercent: 5,
          audioLevelDelta: 10,
        },
      };
    }

    // Calcular intervalos efectivos con overrides
    const baseIntervals = policy.intervals || {
      camera: 15000,
      screen: 15000,
      microphone: 15000,
      gps: 30000,
    };

    const overrides = policy.perDeviceOverrides?.[deviceType] || {};
    const effectiveIntervals = {
      camera: overrides.camera ?? baseIntervals.camera,
      screen: overrides.screen ?? baseIntervals.screen,
      microphone: overrides.microphone ?? baseIntervals.microphone,
      gps: overrides.gps ?? baseIntervals.gps,
    };

    return {
      success: true,
      deviceType,
      effectiveIntervals,
      onlyIfChanged: policy.onlyIfChanged ?? true,
      changeThresholds: policy.changeThresholds || {
        gpsMeters: 10,
        imageDiffPercent: 5,
        audioLevelDelta: 10,
      },
      policyPreset: policy.policyPreset || 'custom',
    };
  }
}

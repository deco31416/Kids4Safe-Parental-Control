import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { LiveSessionGuard } from './live-session.guard';
import { LocationRealtimePayload } from '../location/location.service';
import { LiveService, ConsentPayload, DeviceInfoPayload, OrientationPayload, MotionPayload, DestinationOpenedPayload } from './live.service';

@Controller('live')
@UseGuards(LiveSessionGuard)
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  /**
   * POST /live/consent
   * Registra consentimiento del usuario (auditoría obligatoria)
   */
  @Post('consent')
  async consent(@Body() body: ConsentPayload) {
    return this.liveService.handleConsent(body);
  }

  /**
   * POST /live/device-info
   * Normaliza device info via device-context service
   */
  @Post('device-info')
  async deviceInfo(@Body() body: DeviceInfoPayload) {
    return this.liveService.handleDeviceInfo(body);
  }

  /**
   * POST /live/location/realtime
   * Ubicación en tiempo real (tipo WhatsApp)
   */
  @Post('location/realtime')
  async locationRealtime(@Body() body: LocationRealtimePayload) {
    return this.liveService.handleLocationRealtime(body);
  }

  /**
   * POST /live/orientation
   * Brújula/orientación del dispositivo
   */
  @Post('orientation')
  async orientation(@Body() body: OrientationPayload) {
    return this.liveService.handleOrientation(body);
  }

  /**
   * POST /live/motion
   * Acelerómetro/giroscopio
   */
  @Post('motion')
  async motion(@Body() body: MotionPayload) {
    return this.liveService.handleMotion(body);
  }

  /**
   * POST /live/destination-opened
   * Usuario abrió la URL destino (nueva pestaña)
   */
  @Post('destination-opened')
  async destinationOpened(@Body() body: DestinationOpenedPayload) {
    return this.liveService.handleDestinationOpened(body);
  }
}

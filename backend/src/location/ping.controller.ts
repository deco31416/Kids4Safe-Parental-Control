import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 🏓 PING CONTROLLER - Multi-Region Latency Measurement
 * ======================================================
 * 
 * Endpoints simples para medir RTT desde cliente.
 * Frontend hace N=5 requests y toma el mínimo (evita spikes).
 * 
 * NO ES GEOLOCALIZACIÓN EXACTA - es señal auxiliar para correlación.
 */

@Controller('ping')
export class PingController {
  /**
   * GET /ping - Respuesta instantánea con timestamp
   */
  @Public()
  @Get()
  ping(@Res() res: Response) {
    res.json({
      pong: true,
      timestamp: Date.now(),
      region: process.env.RAILWAY_REGION || 'local',
    });
  }

  /**
   * POST /ping - Igual que GET pero permite POST para CORS
   */
  @Public()
  @Post()
  pingPost(@Body() body: any, @Res() res: Response) {
    res.json({
      pong: true,
      timestamp: Date.now(),
      region: process.env.RAILWAY_REGION || 'local',
      received: body,
    });
  }

  /**
   * GET /ping/health - Health check específico de ping
   */
  @Public()
  @Get('health')
  health(@Res() res: Response) {
    res.json({
      status: 'ok',
      service: 'ping',
      timestamp: Date.now(),
    });
  }
}

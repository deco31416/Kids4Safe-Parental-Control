import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ScreenRecorderClient } from './screen-recorder.client';
import { StorageUrlService } from './storage-url.service';

@Controller('screen-media')
export class ScreenMediaController {
  constructor(
    private readonly recorder: ScreenRecorderClient,
    private readonly urls: StorageUrlService,
  ) {}

  @Public()
  @Get(':token')
  async get(@Param('token') token: string, @Query('signature') signature: string, @Res() response: any, @Query('expires') expires?: string) {
    const key = this.urls.verify(token, signature, expires, 'screen-media');
    const image = await this.recorder.read(key);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Content-Length', image.length);
    response.setHeader('Content-Type', 'image/jpeg');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(image);
  }
}

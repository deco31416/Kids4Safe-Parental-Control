import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { createReadStream } from 'fs';
import { Public } from '../auth/decorators/public.decorator';
import { FileStorageService } from './file-storage.service';
import { StorageUrlService } from './storage-url.service';

@Controller('media')
export class MediaController {
  constructor(
    private readonly files: FileStorageService,
    private readonly urls: StorageUrlService,
  ) {}

  @Public()
  @Get(':token')
  async stream(@Param('token') token: string, @Query('signature') signature: string, @Res() response: any, @Query('expires') expires?: string) {
    const key = this.urls.verify(token, signature, expires, 'media');
    const file = await this.files.open(key);
    const range = this.parseRange(response.req.headers.range, file.bytes);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (range) {
      response.status(206);
      response.setHeader('Content-Length', range.end - range.start + 1);
      response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.bytes}`);
      createReadStream(file.absolutePath, range).pipe(response);
      return;
    }
    response.setHeader('Content-Length', file.bytes);
    createReadStream(file.absolutePath).pipe(response);
  }

  private parseRange(value: string | undefined, size: number) {
    if (!value) return undefined;
    const match = /^bytes=(\d*)-(\d*)$/.exec(value);
    if (!match) return undefined;
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= size) return undefined;
    return { start, end };
  }
}

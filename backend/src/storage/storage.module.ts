import { Global, Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { MediaController } from './media.controller';
import { MediaStorageService } from './media-storage.service';
import { StorageHealthController } from './storage-health.controller';
import { StoragePathService } from './storage-path.service';
import { StorageUrlService } from './storage-url.service';
import { ScreenMediaController } from './screen-media.controller';
import { ScreenRecorderClient } from './screen-recorder.client';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MediaLinksInterceptor } from './media-links.interceptor';

@Global()
@Module({
  controllers: [MediaController, ScreenMediaController, StorageHealthController],
  providers: [FileStorageService, MediaStorageService, ScreenRecorderClient, StoragePathService, StorageUrlService, { provide: APP_INTERCEPTOR, useClass: MediaLinksInterceptor }],
  exports: [FileStorageService, MediaStorageService, ScreenRecorderClient, StoragePathService, StorageUrlService],
})
export class StorageModule {}

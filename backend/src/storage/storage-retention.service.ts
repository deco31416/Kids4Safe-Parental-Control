import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AudioClipsService } from '../audio-clips/audio-clips.service';
import { RecordingsService } from '../recordings/recordings.service';
import { ScreenshotsService } from '../screenshots/screenshots.service';

@Injectable()
export class StorageRetentionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageRetentionService.name);

  constructor(
    private readonly screenshots: ScreenshotsService,
    private readonly audio: AudioClipsService,
    private readonly recordings: RecordingsService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await Promise.all([
      this.screenshots.removeLegacyTtlIndex(),
      this.audio.removeLegacyTtlIndex(),
      this.recordings.removeLegacyTtlIndex(),
    ]);
    await this.cleanup();
  }

  @Cron('0 */10 * * * *')
  async cleanup() {
    const retentionDays = Number(this.config.get('DATA_RETENTION_DAYS') || 30);
    const results = await Promise.allSettled([
      this.screenshots.cleanupOldScreenshots(),
      this.audio.cleanupOldAudioClips(),
      this.recordings.cleanupExpired(retentionDays),
    ]);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(`Falló limpieza de almacenamiento ${index}: ${String(result.reason)}`);
      }
    });
  }
}

import { Module } from '@nestjs/common';
import { AudioClipsModule } from '../audio-clips/audio-clips.module';
import { RecordingsModule } from '../recordings/recordings.module';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { StorageRetentionService } from './storage-retention.service';

@Module({
  imports: [AudioClipsModule, RecordingsModule, ScreenshotsModule],
  providers: [StorageRetentionService],
})
export class StorageRetentionModule {}

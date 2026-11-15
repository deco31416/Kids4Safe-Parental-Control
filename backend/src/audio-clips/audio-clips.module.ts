import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AudioClipsService } from './audio-clips.service';
import { AudioClipsController } from './audio-clips.controller';
import { AudioClip, AudioClipSchema } from './schemas/audio-clip.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AudioClip.name, schema: AudioClipSchema },
    ]),
  ],
  controllers: [AudioClipsController],
  providers: [AudioClipsService],
  exports: [AudioClipsService],
})
export class AudioClipsModule {}

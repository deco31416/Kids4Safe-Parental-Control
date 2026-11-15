import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordingsService } from './recordings.service';
import { AudioRecordingService } from './audio-recording.service';
import { RecordingsController } from './recordings.controller';
import { Recording, RecordingSchema } from './recording.schema';
import { SessionModule } from '../session/session.module';
import { AudioRecordingsController } from './audio-recordings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recording.name, schema: RecordingSchema },
    ]),
    SessionModule,
  ],
  controllers: [RecordingsController, AudioRecordingsController],
  providers: [RecordingsService, AudioRecordingService],
  exports: [RecordingsService, AudioRecordingService],
})
export class RecordingsModule {}

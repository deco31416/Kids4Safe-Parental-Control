import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';
import { Screenshot, ScreenshotSchema } from './schemas/screenshot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Screenshot.name, schema: ScreenshotSchema },
    ]),
  ],
  providers: [ScreenshotsService],
  controllers: [ScreenshotsController],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}

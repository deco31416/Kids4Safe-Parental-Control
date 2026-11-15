import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureFlag, FeatureFlagSchema } from './feature-flag.schema';
import { FeatureFlagsService } from './feature-flags.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
    ]),
  ],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService, MongooseModule],
})
export class FeatureFlagsModule {}

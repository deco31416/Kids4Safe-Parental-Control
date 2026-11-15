import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FeatureFlagDocument = FeatureFlag & Document;

@Schema({ timestamps: true })
export class FeatureFlag {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true, default: false })
  enabled: boolean;

  @Prop()
  updatedBy: string; // adminId que hizo el cambio

  @Prop()
  description: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);

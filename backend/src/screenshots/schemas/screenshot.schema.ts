import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Screenshot extends Document {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  thumbnailUrl: string;

  @Prop({ required: true })
  publicId: string;

  @Prop()
  storageKey?: string;

  @Prop({ enum: ['screen-recorder', 'cloudinary'] })
  storageProvider?: 'screen-recorder' | 'cloudinary';

  @Prop()
  mimeType?: string;

  @Prop()
  sizeBytes?: number;

  @Prop()
  sha256?: string;

  @Prop({ required: true })
  capturedAt: Date;

  @Prop({ required: true, enum: ['screen', 'camera'], default: 'screen' })
  type: 'screen' | 'camera';

  @Prop({ default: false })
  deleted: boolean;
}

export const ScreenshotSchema = SchemaFactory.createForClass(Screenshot);

// Índice para buscar por sesión y fecha
ScreenshotSchema.index({ sessionId: 1, capturedAt: -1 });

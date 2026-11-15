import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AudioClip extends Document {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  publicId: string;

  @Prop()
  storageKey?: string;

  @Prop({ enum: ['filesystem', 'cloudinary'] })
  storageProvider?: 'filesystem' | 'cloudinary';

  @Prop()
  mimeType?: string;

  @Prop()
  sha256?: string;

  @Prop({ required: true })
  capturedAt: Date;

  @Prop({ type: Number })
  duration?: number; // Duración en segundos

  @Prop({ type: Number })
  sizeBytes?: number;

  @Prop({ default: false })
  deleted: boolean;
}

export const AudioClipSchema = SchemaFactory.createForClass(AudioClip);

// Índice para buscar por sesión y fecha
AudioClipSchema.index({ sessionId: 1, capturedAt: -1 });

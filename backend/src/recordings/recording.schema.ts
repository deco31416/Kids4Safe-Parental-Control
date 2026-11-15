import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RecordingDocument = Recording & Document;

/**
 * 🎬 Recording Schema
 * 
 * Metadata de grabaciones almacenadas en filesystem/volumen.
 */

@Schema({ timestamps: true })
export class Recording {
  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true })
  qrId: string;

  @Prop()
  qrName?: string;

  @Prop()
  cloudinaryUrl?: string; // Alias legacy de URL

  @Prop({ required: true })
  publicId: string; // Alias legacy de storageKey

  @Prop()
  storageKey?: string;

  @Prop({ enum: ['filesystem', 'cloudinary'] })
  storageProvider?: 'filesystem' | 'cloudinary';

  @Prop()
  mimeType?: string;

  @Prop()
  sha256?: string;

  @Prop()
  secureUrl?: string; // HTTPS URL

  @Prop()
  format?: string; // webm, mp4, etc.

  @Prop()
  duration?: number; // Duración en segundos

  @Prop()
  sizeBytes?: number; // Tamaño del archivo

  @Prop({ type: Object })
  metadata?: {
    tracks?: string[]; // camera, mic, screen
    resolution?: string;
    codec?: string;
  };

  @Prop()
  uploadedBy?: string; // userId (admin que grabó)

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ default: 'active' })
  status: 'active' | 'deleted' | 'expired';
}

export const RecordingSchema = SchemaFactory.createForClass(Recording);

// Índices
RecordingSchema.index({ sessionId: 1 });
RecordingSchema.index({ qrId: 1 });
RecordingSchema.index({ uploadedAt: -1 });

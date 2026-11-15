import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ default: 'qr-link' })
  source: 'qr-link';

  @Prop()
  photoUrl?: string;

  @Prop()
  photoThumbnailUrl?: string;

  @Prop()
  photoPublicId?: string;

  @Prop({ type: [String], default: [] })
  linkedQrIds?: string[];

  @Prop({ type: [String], default: [] })
  linkedSessionIds?: string[];

  @Prop({ type: Object })
  createdBy?: {
    adminId?: string;
    username?: string;
  };

  @Prop({ type: Object })
  updatedBy?: {
    adminId?: string;
    username?: string;
  };

  @Prop()
  lastAssignedAt?: Date;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);

SubjectSchema.index({ displayName: 'text', phone: 'text', email: 'text', notes: 'text' });
SubjectSchema.index({ linkedQrIds: 1 });
SubjectSchema.index({ linkedSessionIds: 1 });
SubjectSchema.index({ createdAt: -1 });

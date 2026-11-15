import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomInt } from 'crypto';

export type MobileProfileDocument = MobileProfile & Document;

const DEFAULT_AVATARS = ['perfil01', 'perfil02'] as const;

@Schema({ timestamps: true })
export class MobileProfile {
  @Prop({ index: true })
  mobileUserId?: string;

  @Prop({ required: true, unique: true, index: true })
  mobileUnitId: string;

  @Prop({ required: true, unique: true, index: true })
  securityId: string;

  @Prop()
  fullName?: string;

  @Prop()
  phone?: string;

  @Prop({ type: Object })
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };

  @Prop({ enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', ''], default: '' })
  bloodType?: string;

  @Prop()
  avatarUri?: string;

  @Prop()
  avatarThumbnailUrl?: string;

  @Prop()
  avatarPublicId?: string;

  @Prop({ type: String, enum: DEFAULT_AVATARS, default: () => DEFAULT_AVATARS[randomInt(DEFAULT_AVATARS.length)] })
  defaultAvatar?: (typeof DEFAULT_AVATARS)[number];

  @Prop({ type: Object })
  assignedByAdmin?: {
    adminId?: string;
    assignedAt?: Date;
    source?: string;
  };
}

export const MobileProfileSchema = SchemaFactory.createForClass(MobileProfile);

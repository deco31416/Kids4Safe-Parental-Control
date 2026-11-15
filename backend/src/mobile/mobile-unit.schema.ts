import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MobileUnitDocument = MobileUnit & Document;

@Schema({ timestamps: true })
export class MobileUnit {
  @Prop({ required: true, unique: true, index: true })
  unitId: string;

  @Prop()
  deviceLabel?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  platform?: string;

  @Prop({ index: true })
  lastSessionId?: string;

  @Prop({ required: true, select: false })
  unitTokenHash: string;

  @Prop({ type: Object })
  notificationToken?: {
    token?: string;
    provider?: string;
    updatedAt?: Date;
  };

  @Prop({ type: Object })
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    source?: string;
    timestampMs?: number;
    updatedAt?: Date;
  };

  @Prop({ default: false })
  gpsAlwaysEnabled?: boolean;

  @Prop()
  gpsAlwaysUpdatedAt?: Date;

  @Prop({ default: Date.now })
  lastSeenAt: Date;
}

export const MobileUnitSchema = SchemaFactory.createForClass(MobileUnit);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebPushSubscriptionDocument = WebPushSubscription & Document;

@Schema({ timestamps: true })
export class WebPushSubscription {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true, unique: true })
  endpoint: string;

  @Prop({ type: Number, default: null })
  expirationTime?: number | null;

  @Prop({
    type: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    required: true,
  })
  keys: {
    p256dh: string;
    auth: string;
  };

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;

  @Prop({ type: Date })
  lastSentAt?: Date;

  @Prop({ type: Date })
  lastErrorAt?: Date;

  @Prop({ type: String })
  lastError?: string;
}

export const WebPushSubscriptionSchema = SchemaFactory.createForClass(WebPushSubscription);

WebPushSubscriptionSchema.index({ sessionId: 1, lastSeenAt: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TurnUsageSnapshotDocument = HydratedDocument<TurnUsageSnapshot>;

@Schema({ timestamps: true })
export class TurnUsageSnapshot {
  @Prop({ required: true, default: 'metered' })
  provider: 'metered';

  @Prop({ required: true })
  region: string;

  @Prop({ required: true })
  planName: string;

  @Prop()
  periodEnd?: string;

  @Prop({ required: true })
  quotaGb: number;

  @Prop({ required: true })
  usageGb: number;

  @Prop({ required: true })
  overageGb: number;

  @Prop({ required: true })
  remainingGb: number;

  @Prop({ required: true })
  usagePercent: number;

  @Prop({ required: true })
  source: 'metered-api' | 'env-fallback';

  @Prop({ required: true })
  checkedAt: Date;
}

export const TurnUsageSnapshotSchema = SchemaFactory.createForClass(TurnUsageSnapshot);

TurnUsageSnapshotSchema.index({ checkedAt: -1 });
TurnUsageSnapshotSchema.index({ provider: 1, checkedAt: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LocationDocument = Location & Document;

/**
 * 📍 Location Schema
 * Schema básico para ubicación (usado en session.location)
 */

@Schema({ _id: false })
export class Location {
  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop()
  accuracy?: number;

  @Prop()
  city?: string;

  @Prop()
  country?: string;

  @Prop()
  source?: string; // gps, ip

  @Prop()
  confidence?: number;

  @Prop()
  timestamp?: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

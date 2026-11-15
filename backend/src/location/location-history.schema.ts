import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LocationHistoryDocument = LocationHistory & Document;

/**
 * 📍 Location History Schema (ACTUALIZADO con Tracking Completo)
 * 
 * Tracking histórico de ubicaciones GPS/IP de sesiones con:
 * - Detección de movimiento automática
 * - Cálculo de distancias y velocidades
 * - Clasificación de estados (caminando, conduciendo, etc.)
 * - Diferenciación móvil vs desktop
 * - Alertas de anomalías
 * 
 * Permite:
 * - Ver trayectoria completa "estuvo aquí → ahora acá"
 * - Detectar movimiento (cambios significativos de posición)
 * - Analizar patrones de desplazamiento
 * - Exportar para auditoría forense
 */

@Schema({ timestamps: true })
export class LocationHistory {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  qrId: string;

  // Coordenadas geográficas
  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  accuracy?: number; // metros de precisión

  @Prop()
  altitude?: number; // metros sobre nivel del mar

  @Prop()
  altitudeAccuracy?: number;

  @Prop()
  heading?: number; // grados (0-360, 0=Norte)

  @Prop()
  speed?: number; // m/s (velocidad reportada por GPS)

  @Prop({ required: true })
  timestamp: Date;

  // Fuente de la ubicación
  @Prop({ 
    required: true,
    enum: ['gps', 'ip', 'manual', 'gps_native', 'wifi_triangulation', 'ip_geolocation', 'user_confirmed', 'fallback'],
  })
  source: string;

  // Detección de movimiento
  @Prop({ default: false })
  isSignificantMove: boolean; // Si representa movimiento significativo (>50m móvil, >1km desktop)

  @Prop()
  distanceFromPrevious?: number; // metros desde ubicación anterior

  @Prop()
  timeSincePrevious?: number; // segundos desde ubicación anterior

  // Metadata enriquecido
  @Prop({ type: Object })
  metadata?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    address?: string;
    placeType?: string; // indoor, outdoor, vehicle
    confidence?: number; // 0-1
    provider?: string; // ipinfo.io, native-gps, etc.
  };
}

export const LocationHistorySchema = SchemaFactory.createForClass(LocationHistory);

// Índices compuestos para queries eficientes
LocationHistorySchema.index({ sessionId: 1, timestamp: 1 });
LocationHistorySchema.index({ qrId: 1, timestamp: -1 });
LocationHistorySchema.index({ sessionId: 1, isSignificantMove: 1 });
LocationHistorySchema.index({ timestamp: -1 }); // Para limpieza de datos antiguos

// 🚨 TTL automático - borrar después de N días (configurable)
LocationHistorySchema.index(
  { timestamp: 1 },
  { 
    expireAfterSeconds: parseInt(process.env.DATA_RETENTION_DAYS || '30') * 86400,
    name: 'location_history_ttl'
  }
);

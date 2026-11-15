/**
 * 📋 LOCATION TIMELINE COMPONENT
 * ===============================
 * 
 * Timeline vertical cronológico de todas las ubicaciones con:
 * - Timestamp
 * - Dirección/ciudad
 * - Precisión
 * - Distancia desde punto anterior
 * - Estado de movimiento (caminando, conduciendo, etc.)
 * - Iconos visuales según estado
 * 
 * Diferenciación móvil vs desktop
 */

'use client';

import { AlertTriangle as AlertTriangleIcon, Bike as BikeIcon, Car as CarIcon, ChevronDown, ChevronUp, Footprints as FootprintsIcon, Globe as GlobeIcon, HelpCircle as HelpCircleIcon, LocateFixed as LocateFixedIcon, MapPin, PersonStanding as PersonStandingIcon, Radio as RadioIcon, TrainFront as TrainFrontIcon } from 'lucide-react';
import React, { useState } from 'react';
import { LocationHistoryPoint } from '@/lib/location-tracking.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LocationTimelineProps {
  history: LocationHistoryPoint[];
  isMobileDevice: boolean;
}

export function LocationTimeline({ history, isMobileDevice }: LocationTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const displayCount = 10;

  const visibleHistory = showAll ? history : history.slice(-displayCount);

  /**
   * Icono por estado de movimiento
   */
  const movementIcons: Record<string, React.ReactNode> = {
    STATIC: <MapPin className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    WALKING: <PersonStandingIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    RUNNING: <FootprintsIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    CYCLING: <BikeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    DRIVING: <CarIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    TRANSPORT: <TrainFrontIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    UNKNOWN: <HelpCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-muted-foreground" aria-hidden="true" />,
  };

  /**
   * Color por fuente
   */
  const sourceColor: Record<string, string> = {
    GPS_NATIVE: 'bg-green-500',
    gps_native: 'bg-green-500',
    gps: 'bg-green-500',
    WIFI_TRIANGULATION: 'bg-blue-500',
    wifi_triangulation: 'bg-blue-500',
    IP_GEOLOCATION: 'bg-orange-500',
    ip_geolocation: 'bg-orange-500',
    ip: 'bg-orange-500',
    USER_CONFIRMED: 'bg-primary',
    user_confirmed: 'bg-primary',
    manual: 'bg-primary',
  };

  /**
   * Formatear distancia
   */
  const formatDistance = (meters: number | undefined) => {
    if (!meters) return null;
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  /**
   * Formatear tiempo
   */
  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (history.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay ubicaciones para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative space-y-6">
        {/* Línea vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

        {visibleHistory.map((point, index) => {
          const isFirst = index === 0;
          const isLast = index === visibleHistory.length - 1;
          const sourceKey = point.source.toLowerCase();

          return (
            <div key={point.id} className="relative flex gap-4">
              {/* Punto en timeline */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full ${sourceColor[sourceKey] || 'bg-muted'} flex items-center justify-center text-foreground font-bold shadow-lg`}
                >
                  {isFirst ? 'A' : isLast ? 'B' : index + 1}
                </div>
              </div>

              {/* Contenido */}
              <div className="flex-1 pb-6 -mt-1">
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-foreground">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        {point.city || 'Ubicación desconocida'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(point.timestamp), "HH:mm:ss - dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                    
                    {point.movementState && (
                      <Badge variant="outline" className="ml-2">
                        {movementIcons[point.movementState]}{' '}
                        {point.movementState}
                      </Badge>
                    )}
                  </div>

                  {/* Coordenadas */}
                  <div className="text-xs text-muted-foreground mb-2">
                    <MapPin className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Fuente */}
                    <div>
                      <span className="text-muted-foreground">Fuente:</span>{' '}
                      <Badge variant="secondary" className="text-xs">
                        {point.source === 'gps' || point.source === 'gps_native' || point.source === 'GPS_NATIVE'
                          ? <> <LocateFixedIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> GPS </>
                          : point.source === 'ip' || point.source === 'ip_geolocation' || point.source === 'IP_GEOLOCATION'
                          ? <> <GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> IP </>
                          : <> <RadioIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> WiFi </>}
                      </Badge>
                    </div>

                    {/* Precisión */}
                    {point.accuracy && (
                      <div>
                        <span className="text-muted-foreground">Precisión:</span>{' '}
                        <span className={point.accuracy < 50 ? 'text-green-600 font-medium' : 'text-orange-600'}>
                          ±{point.accuracy < 1000 ? `${point.accuracy.toFixed(0)}m` : `${(point.accuracy / 1000).toFixed(0)}km`}
                        </span>
                      </div>
                    )}

                    {/* Movimiento desde punto anterior */}
                    {point.distanceFromPrevious && (
                        <div className="col-span-2 mt-2 pt-2 border-t border-border">
                        <span className="text-muted-foreground">Movimiento:</span>{' '}
                        <span className="font-medium text-blue-600">
                          {formatDistance(point.distanceFromPrevious)}
                        </span>
                        {point.timeSincePrevious && (
                          <span className="text-muted-foreground">
                            {' '}en {formatTime(point.timeSincePrevious)}
                          </span>
                        )}
                        {point.movementSpeed && (
                          <span className="ml-2">
                            <Badge variant="outline" className="text-xs">
                              <CarIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> {point.movementSpeed.toFixed(1)} km/h
                            </Badge>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Velocidad GPS nativa */}
                    {point.speed && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Velocidad GPS:</span>{' '}
                        <span className="font-medium">{(point.speed * 3.6).toFixed(1)} km/h</span>
                      </div>
                    )}

                    {/* Dirección (heading) */}
                    {point.heading !== undefined && point.heading !== null && (
                      <div>
                        <span className="text-muted-foreground">Dirección:</span>{' '}
                        <span>{point.heading}°</span>
                      </div>
                    )}

                    {/* Altitud */}
                    {point.altitude !== undefined && point.altitude !== null && (
                      <div>
                        <span className="text-muted-foreground">Altitud:</span>{' '}
                        <span>{point.altitude.toFixed(0)}m</span>
                      </div>
                    )}
                  </div>

                  {/* Alertas */}
                  {!isMobileDevice && point.distanceFromPrevious && point.distanceFromPrevious > 100000 && (
                    <div className="mt-2 pt-2 border-t border-red-100">
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Cambio sospechoso: {(point.distanceFromPrevious / 1000).toFixed(0)}km en{' '}
                        {point.timeSincePrevious ? formatTime(point.timeSincePrevious) : 'poco tiempo'}
                      </Badge>
                    </div>
                  )}

                  {point.movementSpeed && point.movementSpeed > 200 && (
                    <div className="mt-2 pt-2 border-t border-red-100">
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Velocidad imposible: {point.movementSpeed.toFixed(0)}km/h (probablemente error GPS)
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón para mostrar más */}
      {history.length > displayCount && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Cargar más ({history.length - displayCount} ubicaciones restantes)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

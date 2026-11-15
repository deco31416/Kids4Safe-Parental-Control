/**
 * 🛰️ LOCATION HISTORY TAB COMPONENT
 * ===================================
 * 
 * Tab completo para mostrar historial de ubicaciones de una sesión con:
 * - Resumen de estadísticas (distancia, velocidad, puntos)
 * - Mapa interactivo con ruta (línea azul)
 * - Timeline cronológico de ubicaciones
 * - Exportar a CSV/GPX
 * - Diferenciación visual móvil vs desktop
 * 
 * USO:
 * ```tsx
 * <LocationHistoryTab 
 *   sessionId="sess_123"
 *   deviceType="mobile"
 * />
 * ```
 */

'use client';

import { Activity, AlertTriangle, Bike as BikeIcon, Car as CarIcon, Clock, Download, Footprints as FootprintsIcon, HelpCircle as HelpCircleIcon, Laptop as LaptopIcon, MapPin, Monitor as MonitorIcon, Navigation, PersonStanding as PersonStandingIcon, RefreshCw, Smartphone as SmartphoneIcon, TrainFront as TrainFrontIcon, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { locationTrackingService, LocationHistoryPoint, MovementStats } from '@/lib/location-tracking.service';
import { LocationMap } from './LocationMap';
import { LocationTimeline } from './LocationTimeline';

interface LocationHistoryTabProps {
  sessionId: string;
  deviceType?: 'mobile' | 'tablet' | 'laptop' | 'desktop';
}

export function LocationHistoryTab({ sessionId, deviceType = 'mobile' }: LocationHistoryTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LocationHistoryPoint[]>([]);
  const [stats, setStats] = useState<MovementStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isMobileDevice = deviceType === 'mobile' || deviceType === 'tablet';

  /**
   * Cargar datos
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [historyData, statsData] = await Promise.all([
        locationTrackingService.getLocationHistory(sessionId),
        locationTrackingService.getMovementStats(sessionId),
      ]);

      setHistory(historyData);
      setStats(statsData);
    } catch (err: any) {
      console.error('[LocationHistoryTab] Error cargando datos:', err);
      setError(err.message || 'Error al cargar historial de ubicación');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  /**
   * Refrescar datos
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  /**
   * Exportar a CSV
   */
  const handleExportCSV = () => {
    if (history.length === 0) return;

    const headers = [
      'Timestamp',
      'Latitude',
      'Longitude',
      'Accuracy',
      'Speed',
      'Distance',
      'Movement State',
      'Source',
      'City',
    ];

    const rows = history.map(point => [
      point.timestamp,
      point.latitude,
      point.longitude,
      point.accuracy || '',
      point.speed || '',
      point.distanceFromPrevious || '',
      point.movementState || '',
      point.source,
      point.city || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location-history-${sessionId}-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Renderizar loading
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Cargando historial de ubicación...</p>
        </div>
      </div>
    );
  }

  /**
   * Renderizar error
   */
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  /**
   * Renderizar sin datos
   */
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center p-8">
        <MapPin className="h-16 w-16 text-foreground opacity-30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin historial de ubicación</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {isMobileDevice
            ? 'No se han capturado ubicaciones GPS para esta sesión aún.'
            : 'Esta sesión fue desde desktop/laptop. Solo se registra ubicación IP inicial.'}
        </p>
      </div>
    );
  }

  /**
   * Iconos de dispositivo
   */
  const deviceIcon = {
    mobile: <SmartphoneIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    tablet: <SmartphoneIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    laptop: <LaptopIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
    desktop: <MonitorIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" />,
  }[deviceType];

  /**
   * Formatear distancia
   */
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  /**
   * Formatear duración
   */
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

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

  return (
    <div className="space-y-6">
      {/* Header con botones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{deviceIcon}</span>
          <h3 className="text-lg font-semibold">
            Historial de Ubicación
          </h3>
          {isMobileDevice && (
            <Badge variant="default" className="ml-2">
              Tracking Activo
            </Badge>
          )}
          {!isMobileDevice && (
            <Badge variant="secondary" className="ml-2">
              Solo Verificación IP
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumen de Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Distancia Total */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distancia Total</CardTitle>
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDistance(stats.totalDistanceTraveled)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.significantMoves} movimientos significativos
              </p>
            </CardContent>
          </Card>

          {/* Tiempo Activo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Activo</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(stats.duration)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalPoints} ubicaciones
              </p>
            </CardContent>
          </Card>

          {/* Velocidad Máxima */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Velocidad Máx</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.maxSpeed.toFixed(1)} km/h
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio: {stats.averageSpeed.toFixed(1)} km/h
              </p>
            </CardContent>
          </Card>

          {/* Estado Actual */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado Actual</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {history[history.length - 1]?.movementState || 'UNKNOWN'}
              </div>
              <p className="text-xs text-muted-foreground">
                {movementIcons[history[history.length - 1]?.movementState || 'UNKNOWN']}{' '}
                {stats.currentLocation?.city || 'Ubicación actual'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mapa con Ruta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {isMobileDevice ? 'Mapa de Ruta' : 'Ubicaciones Registradas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationMap
            history={history}
            isMobileDevice={isMobileDevice}
            stats={stats}
          />
        </CardContent>
      </Card>

      {/* Timeline de Ubicaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Ubicaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationTimeline
            history={history}
            isMobileDevice={isMobileDevice}
          />
        </CardContent>
      </Card>

      {/* Estados de Movimiento */}
      {stats && stats.movementStates.length > 0 && isMobileDevice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estados de Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.movementStates.map((state) => (
                <div key={state.state} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{movementIcons[state.state]}</span>
                    <div>
                      <p className="font-medium">{state.state}</p>
                      <p className="text-sm text-muted-foreground">
                        {state.count} veces
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {formatDistance(state.totalDistance)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

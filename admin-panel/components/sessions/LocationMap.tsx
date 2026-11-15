/**
 * 🗺️ LOCATION MAP COMPONENT
 * ==========================
 * 
 * Mapa interactivo que muestra:
 * - Ruta completa (línea azul) para móviles
 * - Puntos discretos para desktop
 * - Marcadores A (inicio) y B (actual)
 * - Círculos de precisión
 * - Popup con detalles al hacer click
 * 
 * Usa Leaflet para renderizar el mapa
 */

'use client';

import { AlertTriangle, Globe as GlobeIcon, MapPin as MapPinIcon } from 'lucide-react';
import { mapIconMarkup } from '@/lib/map-icon-markup';
import React, { useEffect, useRef } from 'react';
import { LocationHistoryPoint, MovementStats } from '@/lib/location-tracking.service';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocationMapProps {
  history: LocationHistoryPoint[];
  isMobileDevice: boolean;
  stats: MovementStats | null;
}

export function LocationMap({ history, isMobileDevice, stats }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Cargar Leaflet dinámicamente (solo en cliente)
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (history.length === 0) return;

    const loadMap = async () => {
      try {
        // Importar Leaflet
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        // Fix para iconos de Leaflet en Next.js
        // @ts-expect-error - Leaflet keeps this private compatibility hook
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Limpiar mapa anterior
        if (mapRef.current) {
          mapRef.current.stop?.();
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Calcular bounds
        const latitudes = history.map(p => p.latitude);
        const longitudes = history.map(p => p.longitude);
        const bounds = L.latLngBounds(
          [Math.min(...latitudes), Math.min(...longitudes)],
          [Math.max(...latitudes), Math.max(...longitudes)]
        );

        // Crear mapa
        if (!mapContainerRef.current) return;
        const map = L.map(mapContainerRef.current, {
          center: [history[history.length - 1].latitude, history[history.length - 1].longitude],
          zoom: 13,
          scrollWheelZoom: true,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        });

        mapRef.current = map;

        // Capa de mapa (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        if (isMobileDevice && history.length > 1) {
          // MÓVIL: Dibujar ruta completa con línea azul
          const routeCoords = history.map(p => [p.latitude, p.longitude] as [number, number]);
          
          L.polyline(routeCoords, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1,
          }).addTo(map);

          // Marcador inicio (A)
          const startIcon = L.divIcon({
            html: '<div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">A</div>',
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          L.marker([history[0].latitude, history[0].longitude], { icon: startIcon })
            .addTo(map)
            .bindPopup(`
              <strong>${mapIconMarkup("location")} Inicio</strong><br>
              ${history[0].city || 'Ubicación inicial'}<br>
              <small>${new Date(history[0].timestamp).toLocaleString('es-CO')}</small>
            `);

          // Marcador actual (B)
          const endIcon = L.divIcon({
            html: '<div style="background: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">B</div>',
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const lastPoint = history[history.length - 1];
          L.marker([lastPoint.latitude, lastPoint.longitude], { icon: endIcon })
            .addTo(map)
            .bindPopup(`
              <strong>${mapIconMarkup("location")} Actual</strong><br>
              ${lastPoint.city || 'Ubicación actual'}<br>
              ${lastPoint.movementState ? `Estado: ${lastPoint.movementState}` : ''}<br>
              <small>${new Date(lastPoint.timestamp).toLocaleString('es-CO')}</small>
            `);

          // Círculos de precisión en puntos clave
          history.forEach((point, index) => {
            if (index % Math.ceil(history.length / 10) === 0 || point.isSignificantMove) {
              const color = point.accuracy && point.accuracy < 50 ? '#10b981' : '#f59e0b';
              
              if (point.accuracy) {
                L.circle([point.latitude, point.longitude], {
                  radius: point.accuracy,
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.1,
                  weight: 1,
                }).addTo(map).bindPopup(`
                  <strong>${point.city || 'Ubicación'}</strong><br>
                  Precisión: ±${point.accuracy.toFixed(0)}m<br>
                  ${point.movementSpeed ? `Velocidad: ${point.movementSpeed.toFixed(1)} km/h` : ''}<br>
                  <small>${new Date(point.timestamp).toLocaleString('es-CO')}</small>
                `);
              }
            }
          });

        } else {
          // DESKTOP: Puntos discretos (no línea)
          history.forEach((point, index) => {
            const isFirst = index === 0;
            const isLast = index === history.length - 1;
            
            let markerColor = '#64748b'; // Gris por defecto
            let markerMarkup = mapIconMarkup('globe');
            
            if (isFirst) {
              markerColor = '#10b981';
              markerMarkup = mapIconMarkup('location');
            } else if (isLast) {
              markerColor = '#ef4444';
              markerMarkup = mapIconMarkup('location');
            }

            const icon = L.divIcon({
              html: `<div style="background: ${markerColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${markerMarkup}</div>`,
              className: '',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });

            L.marker([point.latitude, point.longitude], { icon })
              .addTo(map)
              .bindPopup(`
                <strong>${mapIconMarkup(isFirst || isLast ? "location" : "globe")} ${isFirst ? "Inicio" : isLast ? "Actual" : "Ubicación"}</strong><br>
                ${point.city || 'Ubicación aproximada'}<br>
                IP: ${point.source}<br>
                Precisión: ±${point.accuracy ? (point.accuracy / 1000).toFixed(0) + 'km' : '25km'}<br>
                <small>${new Date(point.timestamp).toLocaleString('es-CO')}</small>
                ${point.distanceFromPrevious && point.distanceFromPrevious > 100000 ? `<br><span style="color: #ef4444;">${mapIconMarkup("warning")} Cambio sospechoso</span>` : ''}
              `);

            // Círculo de precisión grande (IP)
            if (point.accuracy && point.accuracy > 1000) {
              L.circle([point.latitude, point.longitude], {
                radius: point.accuracy,
                color: '#f59e0b',
                fillColor: '#fbbf24',
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '5, 5',
              }).addTo(map);
            }
          });
        }

        // Ajustar vista al bounds
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: isMobileDevice ? 15 : 12,
        });

      } catch (err) {
        console.error('[LocationMap] Error cargando mapa:', err);
      }
    };

    loadMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.stop?.();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [history, isMobileDevice]);

  if (history.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No hay ubicaciones para mostrar en el mapa
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative">
      {/* Contenedor del mapa */}
      <div
        ref={mapContainerRef}
        className="w-full h-[500px] rounded-lg border border-border shadow-sm"
        style={{ zIndex: 0 }}
      />

      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 bg-card bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-3 z-10 text-foreground">
        <h4 className="text-xs font-semibold mb-2">Leyenda</h4>
        {isMobileDevice ? (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500 rounded"></div>
              <span>Ruta completa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-primary-foreground text-[10px] font-bold">A</div>
              <span>Inicio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-primary-foreground text-[10px] font-bold">B</div>
              <span>Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-500 rounded-full"></div>
              <span>Alta precisión (&lt;50m)</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base"><GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /></span>
              <span>Ubicación IP (~25km)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base"><MapPinIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /></span>
              <span>Inicio/Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 border-t-2 border-dashed border-orange-500"></div>
              <span>Radio de precisión</span>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas flotantes */}
      {stats && (
        <div className="absolute top-4 left-4 bg-card bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-3 z-10 max-w-xs text-foreground">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distancia:</span>
              <span className="font-semibold">
                {stats.totalDistanceTraveled < 1000
                  ? `${stats.totalDistanceTraveled.toFixed(0)}m`
                  : `${(stats.totalDistanceTraveled / 1000).toFixed(2)}km`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Velocidad máx:</span>
              <span className="font-semibold">{stats.maxSpeed.toFixed(1)} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Puntos:</span>
              <span className="font-semibold">{stats.totalPoints}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

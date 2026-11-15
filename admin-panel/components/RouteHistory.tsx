"use client";

import { AlertCircle as AlertCircleIcon, BarChart3 as BarChart3Icon, CheckCircle2 as CheckCircle2Icon, CircleDot as CircleDotIcon, FileText as FileTextIcon, Package as PackageIcon, Pause as PauseIcon, Play as PlayIcon, SkipBack as SkipBackIcon, XCircle as XCircleIcon } from 'lucide-react';
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

// Íconos para markers
const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const currentIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type RoutePoint = {
  lat: number;
  lng: number;
  accuracy?: number;
  precision?: "exact" | "approx" | "low";
  timestamp: string; // ISO string
  source?: string;
  speed?: number | null;
  heading?: number | null;
};

type RouteStats = {
  totalPoints: number;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  quality: {
    exact_pct: number;
    approx_pct: number;
    low_pct: number;
    points: number;
  };
  firstPoint: RoutePoint;
  lastPoint: RoutePoint;
};

type Props = {
  sessionId: string;
  backendUrl?: string;
};

function RouteMapController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const container = map.getContainer();
      if (!container?.isConnected) return;
      map.invalidateSize();
      map.panTo(center, { animate: false });
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      map.stop();
    };
  }, [center, map]);

  return null;
}

export function RouteHistory({ sessionId, backendUrl }: Props) {
  const resolvedBackendUrl = backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL;
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch route data
  useEffect(() => {
    if (!resolvedBackendUrl) {
      setError('Backend no configurado');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch route points
        const routeRes = await fetch(`${resolvedBackendUrl}/admin/location/route/${sessionId}`);
        if (!routeRes.ok) throw new Error("Error al cargar ruta");
        const routeData = await routeRes.json();
        setPoints(routeData.points || []);

        // Fetch stats
        const statsRes = await fetch(`${resolvedBackendUrl}/admin/location/stats/${sessionId}`);
        if (!statsRes.ok) throw new Error("Error al cargar estadísticas");
        const statsData = await statsRes.json();
        setStats(statsData);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching route:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, resolvedBackendUrl]);

  // Playback effect
  useEffect(() => {
    if (!isPlaying || points.length === 0) return;

    const interval = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500); // 0.5s por punto

    return () => clearInterval(interval);
  }, [isPlaying, points.length]);

  // Export handlers
  const handleExportGeoJSON = async () => {
    try {
      const res = await fetch(`${resolvedBackendUrl}/admin/location/export/${sessionId}?format=geojson`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `route-${sessionId}.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting GeoJSON:", err);
      alert("Error al exportar GeoJSON");
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${resolvedBackendUrl}/admin/location/export/${sessionId}?format=csv`);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `route-${sessionId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Error al exportar CSV");
    }
  };

  const handleExportReport = async () => {
    try {
      const res = await fetch(`${resolvedBackendUrl}/track/report/${sessionId}`);
      const data = await res.json();
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${sessionId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting report:", err);
      alert("Error al exportar reporte");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Cargando historial de ruta...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-center text-red-600"><XCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> {error}</p>
      </Card>
    );
  }

  if (points.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          No hay puntos de ruta registrados para esta sesión.
        </p>
      </Card>
    );
  }

  // Preparar datos para Polyline
  const polylinePositions: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const currentPoint = points[playbackIndex];
  const center: [number, number] = [currentPoint.lat, currentPoint.lng];

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      {stats && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3Icon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Estadísticas de la Ruta
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Puntos</p>
              <p className="font-bold text-lg">{stats.totalPoints}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Distancia</p>
              <p className="font-bold text-lg">{stats.distanceKm.toFixed(2)} km</p>
              <p className="text-xs text-muted-foreground">{stats.distanceMeters.toFixed(0)}m</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Duración</p>
              <p className="font-bold text-lg">{stats.durationMinutes.toFixed(1)} min</p>
              <p className="text-xs text-muted-foreground">{stats.durationSeconds}s</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Vel. Promedio</p>
              <p className="font-bold text-lg">{stats.avgSpeedKmh.toFixed(1)} km/h</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Vel. Máxima</p>
              <p className="font-bold text-lg text-red-600">{stats.maxSpeedKmh.toFixed(1)} km/h</p>
            </div>
          </div>

          {/* Quality Bar */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-muted-foreground mb-2"><CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Calidad de Precisión</p>
            <div className="flex h-8 rounded overflow-hidden">
              <div
                className="bg-green-500 flex items-center justify-center text-primary-foreground text-xs font-bold"
                style={{ width: `${stats.quality.exact_pct}%` }}
              >
                {stats.quality.exact_pct > 5 && `${stats.quality.exact_pct.toFixed(0)}%`}
              </div>
              <div
                className="bg-yellow-500 flex items-center justify-center text-foreground text-xs font-bold"
                style={{ width: `${stats.quality.approx_pct}%` }}
              >
                {stats.quality.approx_pct > 5 && `${stats.quality.approx_pct.toFixed(0)}%`}
              </div>
              <div
                className="bg-red-500 flex items-center justify-center text-primary-foreground text-xs font-bold"
                style={{ width: `${stats.quality.low_pct}%` }}
              >
                {stats.quality.low_pct > 5 && `${stats.quality.low_pct.toFixed(0)}%`}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span><CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Exacto: {stats.quality.exact_pct.toFixed(1)}%</span>
              <span><AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Aproximado: {stats.quality.approx_pct.toFixed(1)}%</span>
              <span><AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Bajo: {stats.quality.low_pct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground mb-1"><CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Inicio</p>
              <p className="font-mono text-muted-foreground">
                {stats.firstPoint.lat.toFixed(6)}, {stats.firstPoint.lng.toFixed(6)}
              </p>
              <p className="text-muted-foreground">
                {new Date(stats.firstPoint.timestamp).toLocaleString("es-CO")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1"><AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Fin</p>
              <p className="font-mono text-muted-foreground">
                {stats.lastPoint.lat.toFixed(6)}, {stats.lastPoint.lng.toFixed(6)}
              </p>
              <p className="text-muted-foreground">
                {new Date(stats.lastPoint.timestamp).toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Playback Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                if (playbackIndex >= points.length - 1) {
                  setPlaybackIndex(0);
                }
                setIsPlaying(true);
              }
            }}
            variant={isPlaying ? "destructive" : "default"}
          >
            {isPlaying ? <> <PauseIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Pausar </> : <> <PlayIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Reproducir </>}
          </Button>

          <Button
            onClick={() => {
              setPlaybackIndex(0);
              setIsPlaying(false);
            }}
            variant="outline"
          >
            <SkipBackIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Reiniciar
          </Button>

          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={points.length - 1}
              value={playbackIndex}
              onChange={(e) => {
                setPlaybackIndex(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>
                Punto {playbackIndex + 1} de {points.length}
              </span>
              <span>
                {new Date(currentPoint.timestamp).toLocaleTimeString("es-CO")}
              </span>
            </div>
          </div>

          <Button onClick={handleExportGeoJSON} variant="outline" size="sm">
            <PackageIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> GeoJSON
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <BarChart3Icon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> CSV
          </Button>
          <Button onClick={handleExportReport} variant="outline" size="sm">
            <FileTextIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Reporte
          </Button>
        </div>

        {/* Current point info */}
        <div className="mt-3 pt-3 border-t text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <span className="text-muted-foreground">Precisión:</span>
            <span className="ml-2 font-medium">
              {currentPoint.precision === "exact"
                ? <> <CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Exacto </>
                : currentPoint.precision === "approx"
                ? <> <AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Aproximado </>
                : <> <AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Bajo </>}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Accuracy:</span>
            <span className="ml-2 font-medium">
              {Math.round(currentPoint.accuracy ?? 0)}m
            </span>
          </div>
          {currentPoint.speed !== null && currentPoint.speed !== undefined && (
            <div>
              <span className="text-muted-foreground">Velocidad:</span>
              <span className="ml-2 font-medium">
                {(currentPoint.speed * 3.6).toFixed(1)} km/h
              </span>
            </div>
          )}
          {currentPoint.heading !== null && currentPoint.heading !== undefined && (
            <div>
              <span className="text-muted-foreground">Dirección:</span>
              <span className="ml-2 font-medium">{Math.round(currentPoint.heading)}°</span>
            </div>
          )}
        </div>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden">
        <div style={{ width: "100%", height: "500px" }}>
          {typeof window !== "undefined" && (
            <MapContainer
              center={center}
              zoom={14}
              zoomAnimation={false}
              fadeAnimation={false}
              markerZoomAnimation={false}
              style={{ width: "100%", height: "100%" }}
            >
              <RouteMapController center={center} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Polyline de la ruta completa */}
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 4,
                  opacity: 0.7,
                }}
              />

              {/* Marker de inicio */}
              <Marker position={[points[0].lat, points[0].lng]} icon={startIcon}>
                <Popup>
                  <div className="text-sm">
                    <b><CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Inicio</b>
                    <p className="mt-1 text-xs">
                      {new Date(points[0].timestamp).toLocaleString("es-CO")}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Marker de fin */}
              <Marker
                position={[points[points.length - 1].lat, points[points.length - 1].lng]}
                icon={endIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <b><AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Fin</b>
                    <p className="mt-1 text-xs">
                      {new Date(points[points.length - 1].timestamp).toLocaleString("es-CO")}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Marker actual (playback) */}
              <Marker position={[currentPoint.lat, currentPoint.lng]} icon={currentIcon}>
                <Popup>
                  <div className="text-sm space-y-1">
                    <b><CircleDotIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Punto Actual</b>
                    <div>
                      <b>Índice:</b> {playbackIndex + 1} / {points.length}
                    </div>
                    <div>
                      <b>Precisión:</b>{" "}
                      {currentPoint.precision === "exact"
                        ? "Exacto"
                        : currentPoint.precision === "approx"
                        ? "Aproximado"
                        : "Bajo"}
                    </div>
                    <div>
                      <b>Accuracy:</b> {Math.round(currentPoint.accuracy ?? 0)}m
                    </div>
                    {currentPoint.speed !== null && currentPoint.speed !== undefined && (
                      <div>
                        <b>Velocidad:</b> {(currentPoint.speed * 3.6).toFixed(1)} km/h
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      {new Date(currentPoint.timestamp).toLocaleString("es-CO")}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

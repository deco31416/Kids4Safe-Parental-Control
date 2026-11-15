"use client";

import { Map as MapIcon, MapPin as MapPinIcon } from 'lucide-react';
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix para iconos en Next.js
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type LocationData = {
  lat: number;
  lng: number;
  accuracy?: number;
  precision?: "exact" | "approx" | "low";
  timestampMs?: number;
  source?: string;
  speed?: number | null;
  heading?: number | null;
};

type Props = {
  socket: any; // Socket.IO client
  sessionId: string;
};

function LiveMapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const container = map.getContainer();
      if (!container?.isConnected) return;
      map.invalidateSize();
      map.setView(center, zoom, { animate: false });
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      map.stop();
    };
  }, [center, map, zoom]);

  return null;
}

export function LiveMap({ socket, sessionId }: Props) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handler = (msg: any) => {
      if (msg?.type === "location" && msg?.data) {
        setLocation(msg.data);
        setLastUpdate(new Date());
      }
    };

    socket.on("session:event", handler);

    return () => {
      socket.off("session:event", handler);
    };
  }, [socket]);

  // Centro por defecto (Bogotá si no hay ubicación)
  const center: [number, number] = location
    ? [location.lat, location.lng]
    : [4.651, -74.083];

  const precisionColor = {
    exact: "#22c55e", // verde
    approx: "#eab308", // amarillo
    low: "#ef4444", // rojo
  }[location?.precision || "low"];

  const precisionLabel = {
    exact: "Exacto (GPS)",
    approx: "Aproximado (WiFi)",
    low: "Bajo (IP)",
  }[location?.precision || "low"];

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border overflow-hidden shadow-sm">
      {/* Header con info */}
      <div className="flex items-center justify-between p-3 bg-background border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold"><MapIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Ubicación en tiempo real</span>
          {location && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Activo
            </span>
          )}
        </div>

        {location && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span
              className="px-2 py-1 rounded font-medium"
              style={{ backgroundColor: precisionColor + "20", color: precisionColor }}
            >
              {precisionLabel}
            </span>
            <span>
              <b>{Math.round(location.accuracy ?? 0)}m</b> precisión
            </span>
            {lastUpdate && (
              <span className="text-muted-foreground">
                {lastUpdate.toLocaleTimeString("es-CO")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        {typeof window !== "undefined" && (
          <MapContainer
            center={center}
            zoom={location ? 16 : 12}
            zoomAnimation={false}
            fadeAnimation={false}
            markerZoomAnimation={false}
            style={{ width: "100%", height: "100%" }}
            className="z-0"
          >
            <LiveMapController center={center} zoom={location ? 16 : 12} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {location && (
              <>
                {/* Marker de ubicación */}
                <Marker position={[location.lat, location.lng]} icon={markerIcon}>
                  <Popup>
                    <div className="text-sm space-y-1">
                      <div>
                        <b>Precisión:</b> {precisionLabel}
                      </div>
                      <div>
                        <b>Accuracy:</b> {Math.round(location.accuracy ?? 0)}m
                      </div>
                      {location.speed !== null && location.speed !== undefined && (
                        <div>
                          <b>Velocidad:</b> {(location.speed * 3.6).toFixed(1)} km/h
                        </div>
                      )}
                      {location.heading !== null && location.heading !== undefined && (
                        <div>
                          <b>Dirección:</b> {Math.round(location.heading)}°
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Círculo de precisión */}
                {location.accuracy && (
                  <Circle
                    center={[location.lat, location.lng]}
                    radius={location.accuracy}
                    pathOptions={{
                      color: precisionColor,
                      fillColor: precisionColor,
                      fillOpacity: 0.1,
                      weight: 2,
                    }}
                  />
                )}
              </>
            )}
          </MapContainer>
        )}

        {!location && (
          <div className="absolute inset-0 flex items-center justify-center bg-background bg-opacity-90 z-10">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Esperando ubicación...</p>
              <p className="text-xs mt-1">El usuario debe compartir su ubicación</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer con coordenadas */}
      {location && (
        <div className="px-3 py-2 bg-background border-t text-xs text-muted-foreground font-mono">
          <MapPinIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          {location.source && (
            <span className="ml-2 text-muted-foreground">• {location.source}</span>
          )}
        </div>
      )}
    </div>
  );
}

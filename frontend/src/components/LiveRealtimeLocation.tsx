"use client";

import { useRef, useState } from "react";
import { startRealtimeLocation, type RealtimeLocation } from "@/lib/sensors/realtimeLocation";
import { getPublisherJsonHeaders } from "@/lib/publisher-auth";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7000";

type Props = {
  sessionId: string;
};

export function LiveRealtimeLocation({ sessionId }: Props) {
  const stopRef = useRef<null | (() => void)>(null);
  const [status, setStatus] = useState<"idle" | "active" | "stopped" | "error">("idle");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [precision, setPrecision] = useState<string>("");

  async function sendUpdate(location: RealtimeLocation) {
    try {
      const res = await fetch(`${API}/live/location/realtime`, {
        method: "POST",
        headers: getPublisherJsonHeaders(sessionId),
        body: JSON.stringify({
          sessionId,
          ...location,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.precision) {
        setPrecision(data.precision);
      }
    } catch (error) {
      console.error("Error sending location:", error);
    }
  }

  function handleStart() {
    if (stopRef.current) return; // Ya está activo

    stopRef.current = startRealtimeLocation(
      async (loc) => {
        setStatus("active");
        setAccuracy(loc.accuracy ?? null);
        await sendUpdate(loc);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setStatus("error");
        stopRef.current = null;
      }
    );
  }

  function handleStop() {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
      setStatus("stopped");
    }
  }

  const accuracyText = accuracy !== null ? `${Math.round(accuracy)}m` : "...";

  const precisionBadge = {
    exact: { bg: "bg-green-100", text: "text-green-800", label: "Exacto (GPS)" },
    approx: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Aproximado (WiFi)" },
    low: { bg: "bg-red-100", text: "text-red-800", label: "Bajo (IP)" },
  }[precision] || { bg: "bg-gray-100", text: "text-gray-800", label: "..." };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">📍 Ubicación en tiempo real</h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${precisionBadge.bg} ${precisionBadge.text}`}
        >
          {precisionBadge.label}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Precisión: <b>{accuracyText}</b></span>
        {status === "active" && (
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Activo
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={status === "active"}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "active" ? "Compartiendo..." : "Compartir ubicación"}
        </button>

        <button
          onClick={handleStop}
          disabled={status !== "active"}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Detener
        </button>
      </div>

      {status === "error" && (
        <p className="text-xs text-red-600">
          ⚠️ Error al acceder a la ubicación. Verifica permisos del navegador.
        </p>
      )}

      <p className="text-xs text-gray-500">
        💡 La ubicación se comparte mientras esta pestaña esté abierta.
        {" "}
        <span className="font-semibold">No cierres esta pestaña.</span>
      </p>
    </div>
  );
}

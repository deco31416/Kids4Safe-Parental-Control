"use client";

import { AlertTriangle as AlertTriangleIcon, CheckCircle2 as CheckCircle2Icon, Clock as ClockIcon, MoveUpRight as MoveUpRightIcon, Siren as SirenIcon, TrendingDown as TrendingDownIcon, Zap as ZapIcon } from 'lucide-react';
import { useEffect, useState } from "react";
import { Card } from "./ui/card";

type Alert = {
  type: "PRECISION_DROP" | "SPEED_ANOMALY" | "JUMP_ANOMALY" | "LOCATION_STALE";
  severity: "warn" | "high";
  message: string;
  timestamp: Date;
  meta?: any;
};

type Props = {
  socket: any;
  sessionId: string;
};

export function LocationAlerts({ socket, sessionId }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handler = (msg: any) => {
      if (msg?.type === "alert") {
        const alert: Alert = {
          ...msg.data,
          timestamp: new Date(),
        };
        
        setAlerts((prev) => [alert, ...prev].slice(0, 20)); // Mantener últimos 20
      }
    };

    socket.on("session:event", handler);

    return () => {
      socket.off("session:event", handler);
    };
  }, [socket]);

  const getSeverityColor = (severity: string) => {
    return severity === "high" ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50";
  };

  const getSeverityIcon = (severity: string) => {
    return severity === "high" ? <SirenIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> : <AlertTriangleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" />;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PRECISION_DROP":
        return <TrendingDownIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" />;
      case "SPEED_ANOMALY":
        return <ZapIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" />;
      case "JUMP_ANOMALY":
        return <MoveUpRightIcon className="inline-block h-4 w-4 shrink-0 align-middle text-orange-600" aria-hidden="true" />;
      case "LOCATION_STALE":
        return <ClockIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" />;
      default:
        return <AlertTriangleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" />;
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <span><CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /></span>
          <span className="font-medium">Sin alertas</span>
          <span className="text-xs text-green-600">Todo funciona correctamente</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <SirenIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Alertas Recientes ({alerts.length})
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`p-3 border-l-4 rounded ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <span className="text-lg">
                  {getSeverityIcon(alert.severity)} {getTypeIcon(alert.type)}
                </span>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.timestamp.toLocaleTimeString("es-CO")}
                  </p>
                  {alert.meta && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {alert.meta.accuracy && (
                        <div>Precisión: {Math.round(alert.meta.accuracy)}m</div>
                      )}
                      {alert.meta.meters && (
                        <div>
                          Salto: {Math.round(alert.meta.meters)}m en{" "}
                          {alert.meta.seconds?.toFixed(1)}s
                        </div>
                      )}
                      {alert.meta.kmh && <div>Velocidad: {alert.meta.kmh} km/h</div>}
                    </div>
                  )}
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${
                  alert.severity === "high"
                    ? "bg-red-200 text-red-800"
                    : "bg-yellow-200 text-yellow-800"
                }`}
              >
                {alert.severity === "high" ? "ALTA" : "MEDIA"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {alerts.length >= 20 && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Mostrando últimas 20 alertas
        </p>
      )}
    </Card>
  );
}

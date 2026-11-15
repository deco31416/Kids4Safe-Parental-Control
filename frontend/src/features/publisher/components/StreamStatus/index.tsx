/**
 * StreamStatus Component
 * Visualización limpia del estado de los streams
 * Enterprise clean style
 */

import { Activity } from "lucide-react";
import type { StreamState } from "../../types/publisher.types";

interface StreamStatusProps {
  streamState: StreamState;
  qrName: string;
}

export function StreamStatus({ streamState, qrName }: StreamStatusProps) {
  const { camera, mic, screen, location } = streamState;
  const isAnyStreamActive = camera || screen;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Sesión en vivo
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{qrName}</p>
      </div>

      {isAnyStreamActive && (
        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
          <Activity className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-sm text-green-700 dark:text-green-400">
            Transmisión activa
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <StatusBadge label="Cámara" active={camera} />
        <StatusBadge label="Micrófono" active={mic} />
        <StatusBadge label="Pantalla" active={screen} />
        <StatusBadge label="Ubicación" active={location} />
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  label: string;
  active: boolean;
}

function StatusBadge({ label, active }: StatusBadgeProps) {
  return (
    <div
      className={
        active
          ? "px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
          : "px-4 py-2 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
      }
    >
      {label}: {active ? "ON" : "OFF"}
    </div>
  );
}

/**
 * StreamPublisher Component
 * Controles premium para activar cámara, mic, pantalla y ubicación
 * Glass morphism, shadows, visual feedback premium
 */

import { Button } from "@/components/ui/button";
import {
  Video,
  VideoOff,
  MonitorUp,
  MapPin,
  ExternalLink,
  Square,
  AlertCircle,
} from "lucide-react";
import type { StreamState } from "../../types/publisher.types";

interface StreamPublisherProps {
  streamState: StreamState;
  destinationUrl: string | null;
  onStartCamera: () => Promise<void>;
  onStartScreen: () => Promise<void>;
  onRequestLocation: () => Promise<void>;
  onOpenDestination: () => void;
  onStopAll: () => Promise<void>;
  sessionId: string;
}

export function StreamPublisher({
  streamState,
  destinationUrl,
  onStartCamera,
  onStartScreen,
  onRequestLocation,
  onOpenDestination,
  onStopAll,
  sessionId,
}: StreamPublisherProps) {
  const { camera, mic, screen, location } = streamState;

  return (
    <div className="space-y-6">
      {/* Controles principales */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 mb-4">
            Stream controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Botón Cámara + Mic */}
            <Button
              onClick={onStartCamera}
              disabled={camera && mic}
              variant="outline"
              size="lg"
              className="h-14 rounded-lg border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {camera ? (
                <Video className="mr-2 h-5 w-5 text-green-600" />
              ) : (
                <VideoOff className="mr-2 h-5 w-5" />
              )}
              <span className="font-medium">
                {camera && mic ? "Camera active" : "Enable camera & mic"}
              </span>
            </Button>

            {/* Botón Pantalla */}
            <Button
              onClick={onStartScreen}
              disabled={screen}
              variant="outline"
              size="lg"
              className="h-14 rounded-lg border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <MonitorUp className="mr-2 h-5 w-5" />
              <span className="font-medium">
                {screen ? "Screen shared" : "Share screen"}
              </span>
            </Button>

            {/* Botón Ubicación */}
            <Button
              onClick={onRequestLocation}
              disabled={location}
              variant="outline"
              size="lg"
              className="h-14 rounded-lg border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <MapPin className="mr-2 h-5 w-5" />
              <span className="font-medium">
                {location ? "Location shared" : "Share location"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Acciones secundarias */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          {/* Botón continuar (si hay destination) */}
          {destinationUrl && (
            <Button
              onClick={onOpenDestination}
              disabled={!camera && !screen}
              size="lg"
              className="h-12 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 font-semibold flex-1"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Continue to site
            </Button>
          )}

          {/* Botón detener */}
          <Button
            onClick={onStopAll}
            variant="destructive"
            size="lg"
            className="h-12 rounded-lg font-semibold sm:flex-none sm:min-w-[200px]"
          >
            <Square className="mr-2 h-5 w-5" />
            Stop stream
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/30 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Keep this tab open
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              The stream will remain active while you continue to the destination site.
            </p>
          </div>
        </div>
      </div>

      {/* Session ID */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-mono">
          Sesión: {sessionId.substring(0, 24)}...
        </p>
      </div>
    </div>
  );
}

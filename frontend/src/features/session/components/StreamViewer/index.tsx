/**
 * StreamViewer Component
 * Displays camera and screen share video streams
 */

'use client';

import { RefObject } from 'react';

interface StreamViewerProps {
  videoRef: RefObject<HTMLVideoElement>;
  screenVideoRef: RefObject<HTMLVideoElement>;
  hasCameraStream: boolean;
  hasScreenStream: boolean;
}

export function StreamViewer({
  videoRef,
  screenVideoRef,
  hasCameraStream,
  hasScreenStream,
}: StreamViewerProps) {
  void videoRef;
  void screenVideoRef;
  void hasCameraStream;
  void hasScreenStream;

  return (
    <div className="space-y-4">
      {/* ==========
      Kids4Safe
      ========== */}
      {/* Camera Stream */}
      {/* <div className="rounded-2xl overflow-hidden bg-card ring-1 ring-black/5 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b border-black/5 dark:border-white/10">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Cámara</h3>
          {hasCameraStream && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">En vivo</span>
            </div>
          )}
        </div>
        <div className="relative aspect-video bg-black/90">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          {!hasCameraStream && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Camera className="w-12 h-12 mx-auto opacity-50" />
                <p className="text-sm">Cámara no disponible</p>
              </div>
            </div>
          )}
        </div>
      </div> */}

      {/* Screen Stream */}
      {/* <div className="rounded-2xl overflow-hidden bg-card ring-1 ring-black/5 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b border-black/5 dark:border-white/10">
          <Monitor className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Pantalla Compartida</h3>
          {hasScreenStream && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">En vivo</span>
            </div>
          )}
        </div>
        <div className="relative aspect-video bg-black/90">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          {!hasScreenStream && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Monitor className="w-12 h-12 mx-auto opacity-50" />
                <p className="text-sm">Pantalla no compartida</p>
              </div>
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
}

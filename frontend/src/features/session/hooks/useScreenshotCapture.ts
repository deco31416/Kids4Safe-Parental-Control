import { useEffect, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { captureFrameFromStream } from '@/lib/screen-capture';

type StreamsReady = {
  camera: boolean;
  screen: boolean;
};

type ScreenshotIntervalsMs = {
  screen: number | null;
  camera: number | null;
};

type UseScreenshotCaptureOptions = {
  sessionId: string;
  streamsReady: StreamsReady;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  screenVideoRef: MutableRefObject<HTMLVideoElement | null>;
  cameraStreamRef: MutableRefObject<MediaStream | null>;
  screenStreamRef: MutableRefObject<MediaStream | null>;
  realtimeSocketRef: MutableRefObject<Socket | null>;
  screenshotIntervalsMs: ScreenshotIntervalsMs;
};

export function useScreenshotCapture({
  sessionId,
  streamsReady,
  videoRef,
  screenVideoRef,
  cameraStreamRef,
  screenStreamRef,
  realtimeSocketRef,
  screenshotIntervalsMs,
}: UseScreenshotCaptureOptions) {
  useEffect(() => {
    if (!streamsReady.screen || !screenStreamRef.current || !screenVideoRef.current || !realtimeSocketRef.current || !screenshotIntervalsMs.screen) {
      console.log('⏸️ [Screenshot Screen] Esperando condiciones:', {
        streamsReady: streamsReady.screen,
        hasStream: !!screenStreamRef.current,
        hasVideo: !!screenVideoRef.current,
        hasSocket: !!realtimeSocketRef.current,
        hasIntervals: !!screenshotIntervalsMs.screen,
        interval: screenshotIntervalsMs.screen,
      });
      return;
    }

    console.log('🔧 [Screenshot] Iniciando captura de pantalla con intervalo:', screenshotIntervalsMs.screen);

    const screenshotInterval = setInterval(async () => {
      const socket = realtimeSocketRef.current;
      if (screenVideoRef.current && socket?.connected) {
        try {
          const frame = await captureFrameFromStream(screenVideoRef.current);
          console.log(`📸 [Screenshot] Capturando pantalla... Frame size: ${frame.length} bytes`);

          socket.emit('screen-capture', {
            sessionId,
            image: frame,
            timestamp: Date.now(),
            type: 'screen',
          });
          console.log('📸 Screenshot de pantalla enviado para guardar');
        } catch (error) {
          console.error('❌ Error capturando screenshot de pantalla:', error);
        }
      } else {
        console.warn('⚠️ [Screenshot] No se puede capturar:', {
          hasVideo: !!screenVideoRef.current,
          socketConnected: socket?.connected,
        });
      }
    }, screenshotIntervalsMs.screen);

    return () => clearInterval(screenshotInterval);
  }, [realtimeSocketRef, screenStreamRef, screenVideoRef, sessionId, screenshotIntervalsMs.screen, streamsReady.screen]);

  useEffect(() => {
    if (!streamsReady.camera || !cameraStreamRef.current || !videoRef.current || !realtimeSocketRef.current || !screenshotIntervalsMs.camera) {
      console.log('⏸️ [Screenshot Camera] Esperando condiciones:', {
        streamsReady: streamsReady.camera,
        hasStream: !!cameraStreamRef.current,
        hasVideo: !!videoRef.current,
        hasSocket: !!realtimeSocketRef.current,
        hasIntervals: !!screenshotIntervalsMs.camera,
        interval: screenshotIntervalsMs.camera,
      });
      return;
    }

    console.log('🔧 [Screenshot] Iniciando captura de cámara con intervalo:', screenshotIntervalsMs.camera);

    const screenshotInterval = setInterval(async () => {
      const socket = realtimeSocketRef.current;
      if (videoRef.current && socket?.connected) {
        try {
          const frame = await captureFrameFromStream(videoRef.current);
          console.log(`📸 [Screenshot] Capturando cámara... Frame size: ${frame.length} bytes`);

          socket.emit('screen-capture', {
            sessionId,
            image: frame,
            timestamp: Date.now(),
            type: 'camera',
          });
          console.log('📸 Screenshot de cámara enviado para guardar');
        } catch (error) {
          console.error('❌ Error capturando screenshot de cámara:', error);
        }
      } else {
        console.warn('⚠️ [Screenshot] No se puede capturar cámara:', {
          hasVideo: !!videoRef.current,
          socketConnected: socket?.connected,
        });
      }
    }, screenshotIntervalsMs.camera);

    return () => clearInterval(screenshotInterval);
  }, [cameraStreamRef, realtimeSocketRef, videoRef, sessionId, screenshotIntervalsMs.camera, streamsReady.camera]);
}

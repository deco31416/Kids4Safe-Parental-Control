import { useEffect, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { captureFrameFromStream } from '@/lib/screen-capture';

type StreamsReady = {
  camera: boolean;
  screen: boolean;
};

type CaptureIntervals = {
  camera: number;
  screen: number;
};

type UseSocketFrameTransmissionOptions = {
  sessionId: string;
  socket: Socket | null;
  streamsReady: StreamsReady;
  effectiveIntervals: CaptureIntervals | null;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  screenVideoRef: MutableRefObject<HTMLVideoElement | null>;
  cameraStreamRef: MutableRefObject<MediaStream | null>;
  screenStreamRef: MutableRefObject<MediaStream | null>;
};

export function useSocketFrameTransmission({
  sessionId,
  socket,
  streamsReady,
  effectiveIntervals,
  videoRef,
  screenVideoRef,
  cameraStreamRef,
  screenStreamRef,
}: UseSocketFrameTransmissionOptions) {
  useEffect(() => {
    if (!streamsReady.camera || !cameraStreamRef.current || !videoRef.current || !socket || !effectiveIntervals) return;

    const interval = setInterval(async () => {
      if (videoRef.current && socket.connected) {
        const frame = await captureFrameFromStream(videoRef.current);
        socket.emit('camera-frame', { sessionId, frame });
      }
    }, effectiveIntervals.camera);

    return () => clearInterval(interval);
  }, [cameraStreamRef, videoRef, socket, sessionId, effectiveIntervals, streamsReady.camera]);

  useEffect(() => {
    if (!streamsReady.screen || !screenStreamRef.current || !screenVideoRef.current || !socket || !effectiveIntervals) return;

    const interval = setInterval(async () => {
      if (screenVideoRef.current && socket.connected) {
        const frame = await captureFrameFromStream(screenVideoRef.current);
        socket.emit('screen-frame', { sessionId, frame });
      }
    }, effectiveIntervals.screen);

    return () => clearInterval(interval);
  }, [screenStreamRef, screenVideoRef, socket, sessionId, effectiveIntervals, streamsReady.screen]);
}

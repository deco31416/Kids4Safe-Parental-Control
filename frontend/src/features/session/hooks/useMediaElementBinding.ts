import { useEffect, type MutableRefObject } from 'react';

type StreamsReady = {
  camera: boolean;
  screen: boolean;
};

type UseMediaElementBindingOptions = {
  streamsReady: StreamsReady;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  screenVideoRef: MutableRefObject<HTMLVideoElement | null>;
  cameraStreamRef: MutableRefObject<MediaStream | null>;
  screenStreamRef: MutableRefObject<MediaStream | null>;
};

function bindStreamToVideo(
  label: 'Camera' | 'Screen',
  video: HTMLVideoElement,
  stream: MediaStream
) {
  console.log(`${label === 'Camera' ? '📹' : '📺'} [${label}] Asignando stream a video element...`);

  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  const handler = () => {
    video.removeEventListener('loadedmetadata', handler);
    console.log(`✅ [${label}] Metadata cargada:`, {
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState,
    });

    video.play()
      .then(() => console.log(`✅ [${label}] Video reproduciendo`))
      .catch((error) => console.warn(`⚠️ [${label}] No se pudo reproducir:`, error));
  };

  video.addEventListener('loadedmetadata', handler);
  return () => video.removeEventListener('loadedmetadata', handler);
}

export function useMediaElementBinding({
  streamsReady,
  videoRef,
  screenVideoRef,
  cameraStreamRef,
  screenStreamRef,
}: UseMediaElementBindingOptions) {
  useEffect(() => {
    const video = videoRef.current;
    const stream = cameraStreamRef.current;
    if (!streamsReady.camera || !stream || !video) return;

    return bindStreamToVideo('Camera', video, stream);
  }, [cameraStreamRef, videoRef, streamsReady.camera]);

  useEffect(() => {
    const video = screenVideoRef.current;
    const stream = screenStreamRef.current;
    if (!streamsReady.screen || !stream || !video) return;

    return bindStreamToVideo('Screen', video, stream);
  }, [screenStreamRef, screenVideoRef, streamsReady.screen]);
}

export async function startScreenCapture(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true as any,
      audio: false,
    });
    
    return stream;
  } catch (error) {
    console.error('Error capturando pantalla:', error);
    return null;
  }
}

export function stopScreenCapture(stream: MediaStream) {
  stream.getTracks().forEach(track => track.stop());
}

export async function captureFrameFromStream(videoElement: HTMLVideoElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.drawImage(videoElement, 0, 0);
  
  return canvas.toDataURL('image/jpeg', 0.7);
}

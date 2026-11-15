export async function startScreenCapture(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    } as any);
    
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
  // Wait for video to be ready with valid dimensions
  if (videoElement.readyState < 2) {
    await new Promise<void>((resolve) => {
      const handler = () => {
        videoElement.removeEventListener('loadedmetadata', handler);
        resolve();
      };
      videoElement.addEventListener('loadedmetadata', handler);
      // Timeout fallback
      setTimeout(resolve, 3000);
    });
  }
  
  // Validate dimensions
  if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    console.warn('⚠️ [Capture] Video sin dimensiones válidas:', {
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
      readyState: videoElement.readyState,
    });
    return '';
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.drawImage(videoElement, 0, 0);
  
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
  
  // Log capture success
  console.log('✅ [Capture] Frame capturado:', {
    width: canvas.width,
    height: canvas.height,
    size: dataUrl.length,
  });
  
  return dataUrl;
}

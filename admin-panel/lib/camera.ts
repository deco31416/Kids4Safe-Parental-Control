export async function startCamera(videoElement: HTMLVideoElement): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    
    videoElement.srcObject = stream;
    await videoElement.play();
    
    return stream;
  } catch (error) {
    console.error('Error al acceder a la cámara:', error);
    throw error;
  }
}

export function stopCamera(videoElement: HTMLVideoElement) {
  const stream = videoElement.srcObject as MediaStream;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
  }
}

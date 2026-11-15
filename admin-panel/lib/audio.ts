export async function startMicrophone(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });
    
    return stream;
  } catch (error) {
    console.error('Error accediendo al micrófono:', error);
    return null;
  }
}

export function stopMicrophone(stream: MediaStream) {
  stream.getTracks().forEach(track => track.stop());
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(private stream: MediaStream, private onDataAvailable: (blob: Blob) => void) {}

  start() {
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.onDataAvailable(event.data);
      }
    };

    // Enviar chunks cada 1 segundo
    this.mediaRecorder.start(1000);
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
}

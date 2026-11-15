import { getPublisherJsonHeaders } from './publisher-auth';

/**
 * Detecta el mejor MIME type soportado por el navegador
 */
function getSupportedAudioMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log(`🎤 Using MIME type: ${type}`);
      return type;
    }
  }
  
  console.warn('⚠️ No optimal audio MIME type supported, using default');
  return '';
}

export async function startMicrophone(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });
    
    // 🔍 Validar que hay tracks activos
    const activeTracks = stream.getAudioTracks().filter(t => t.enabled && t.readyState === 'live');
    if (activeTracks.length === 0) {
      console.warn('🎤 Mic stream sin tracks activos');
      return null;
    }
    
    console.log(`✅ Micrófono activado con ${activeTracks.length} track(s)`);
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
  private chunkIndex: number = 0;

  constructor(
    private stream: MediaStream, 
    private sessionId: string,
    private qrId: string,
    private onDataAvailable?: (blob: Blob) => void,
    private intervalMs: number = 1000 // 🆕 Intervalo configurable
  ) {}

  start() {
    // 🔍 Detectar MIME type soportado
    const mimeType = getSupportedAudioMimeType();
    
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
    });

    // 🔒 CRÍTICO: ondataavailable NO debe ser async (MediaRecorder no espera Promises)
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      
      // Callback legacy (WebSocket)
      if (this.onDataAvailable) {
        this.onDataAvailable(event.data);
      }

      // Fire-and-forget: no bloquear el evento
      this.sendChunkToBackend(event.data)
        .catch(err => console.error('❌ Error enviando audio chunk:', err));
    };

    // 🆕 Enviar chunks según intervalo configurado
    this.mediaRecorder.start(this.intervalMs);
    console.log(`🎤 AudioRecorder iniciado (intervalo: ${this.intervalMs}ms, MIME: ${mimeType})`);
  }

  private async sendChunkToBackend(blob: Blob) {
    try {
      // Convertir blob a base64
      const base64 = await this.blobToBase64(blob);

      // Enviar al backend
      await fetch('/api/recordings/audio/chunk', {
        method: 'POST',
        headers: getPublisherJsonHeaders(this.sessionId),
        body: JSON.stringify({
          sessionId: this.sessionId,
          qrId: this.qrId,
          audioData: base64.split(',')[1], // Remover "data:audio/webm;base64,"
          timestamp: Date.now(),
          chunkIndex: this.chunkIndex++,
          format: 'webm',
        }),
      });

      console.log(`🎤 Audio chunk ${this.chunkIndex} enviado (${(blob.size / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error('Error enviando chunk de audio:', error);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async stop(): Promise<string | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.warn('⚠️ MediaRecorder ya está inactivo');
      return null;
    }

    // 🔒 CRÍTICO: Esperar el último chunk antes de finalizar
    await new Promise<void>((resolve) => {
      this.mediaRecorder!.onstop = () => {
        console.log('🎤 MediaRecorder detenido, último chunk procesado');
        resolve();
      };
      this.mediaRecorder!.stop();
    });

    // Finalizar grabación en backend (persiste en su volumen)
    try {
      const response = await fetch('/api/recordings/audio/finish', {
        method: 'POST',
        headers: getPublisherJsonHeaders(this.sessionId),
        body: JSON.stringify({
          sessionId: this.sessionId,
          qrId: this.qrId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const storageUrl = data.storageUrl || data.cloudinaryUrl;
        console.log('✅ Grabación de audio finalizada:', storageUrl);
        return storageUrl;
      } else {
        console.warn('⚠️ No se pudo finalizar grabación de audio');
        return null;
      }
    } catch (error) {
      console.error('Error finalizando grabación de audio:', error);
      return null;
    }
  }
}

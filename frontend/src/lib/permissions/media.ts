export async function requestCameraPermission(facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream | null> {
  try {
    console.log(`📷 Solicitando cámara (${facingMode === 'user' ? 'frontal' : 'trasera'})...`);

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log(`✅ Cámara ${facingMode === 'user' ? 'frontal' : 'trasera'} activada`);
    return stream;
  } catch (error: any) {
    console.error(`❌ Error al solicitar cámara ${facingMode}:`, error);
    throw new Error(`No se pudo acceder a la cámara: ${error.message}`);
  }
}

export async function requestMicrophonePermission(): Promise<MediaStream | null> {
  try {
    console.log('🎤 Solicitando micrófono...');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    console.log('✅ Micrófono activado');
    return stream;
  } catch (error: any) {
    console.error('❌ Error al solicitar micrófono:', error);
    throw new Error(`No se pudo acceder al micrófono: ${error.message}`);
  }
}

export async function requestScreenCapturePermission(): Promise<MediaStream | null> {
  try {
    console.log('🖥️ Solicitando compartir pantalla...');

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Este navegador no soporta compartir pantalla');
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'monitor',
      } as any,
      audio: false,
    });

    console.log('✅ Compartir pantalla activado');
    return stream;
  } catch (error: any) {
    console.error('❌ Error al solicitar compartir pantalla:', error);
    throw new Error(`No se pudo compartir pantalla: ${error.message}`);
  }
}

import { useEffect, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';

type StreamsReady = {
  microphone: boolean;
};

type UseAudioClipCaptureOptions = {
  sessionId: string;
  streamsReady: StreamsReady;
  micStreamRef: MutableRefObject<MediaStream | null>;
  realtimeSocketRef: MutableRefObject<Socket | null>;
  microphoneIntervalMs?: number | null;
};

export function useAudioClipCapture({
  sessionId,
  streamsReady,
  micStreamRef,
  realtimeSocketRef,
  microphoneIntervalMs,
}: UseAudioClipCaptureOptions) {
  useEffect(() => {
    if (!streamsReady.microphone || !micStreamRef.current || !realtimeSocketRef.current || !microphoneIntervalMs) {
      console.log('⏸️ [Audio Clip] Esperando condiciones:', {
        streamsReady: streamsReady.microphone,
        hasStream: !!micStreamRef.current,
        hasSocket: !!realtimeSocketRef.current,
        hasIntervals: !!microphoneIntervalMs,
        interval: microphoneIntervalMs,
      });
      return;
    }

    console.log('🔧 [Audio Clip] Iniciando captura con intervalo:', microphoneIntervalMs);

    let mediaRecorder: MediaRecorder | null = null;

    const startAudioClipCapture = async () => {
      try {
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
        ];

        let mimeType = '';
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }

        if (!mimeType) {
          console.warn('⚠️ No hay MIME type de audio soportado');
          return null;
        }

        const stream = micStreamRef.current;
        if (!stream) {
          console.warn('⚠️ No hay stream de micrófono disponible');
          return null;
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType });

        let audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (audioChunks.length === 0) return;

          const socket = realtimeSocketRef.current;
          if (!socket?.connected) return;

          try {
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const reader = new FileReader();

            reader.onloadend = () => {
              const base64Audio = reader.result as string;

              socket.emit('audio-capture', {
                sessionId,
                audio: base64Audio,
                timestamp: Date.now(),
                duration: microphoneIntervalMs / 1000,
              });

              console.log(`🎤 Audio clip enviado para guardar (${(audioBlob.size / 1024).toFixed(2)} KB)`);
            };

            reader.readAsDataURL(audioBlob);
          } catch (error) {
            console.error('❌ Error capturando audio clip:', error);
          }

          audioChunks = [];
        };

        const interval = setInterval(() => {
          if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
          }
          if (mediaRecorder?.state === 'inactive' && micStreamRef.current) {
            audioChunks = [];
            mediaRecorder.start();
          }
        }, microphoneIntervalMs);

        mediaRecorder.start();
        console.log(`🎤 Audio clip capture iniciado (intervalo: ${microphoneIntervalMs}ms)`);

        return interval;
      } catch (error) {
        console.error('❌ Error iniciando audio clip capture:', error);
        return null;
      }
    };

    const intervalPromise = startAudioClipCapture();

    return () => {
      intervalPromise.then((interval) => {
        if (interval) clearInterval(interval);
      });
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
  }, [micStreamRef, realtimeSocketRef, sessionId, microphoneIntervalMs, streamsReady.microphone]);
}

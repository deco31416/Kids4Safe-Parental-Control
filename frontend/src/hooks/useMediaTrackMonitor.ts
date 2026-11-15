import { useCallback, useEffect, useRef } from 'react';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';

/**
 * 🔍 P0 #4: Media Track Interruption Detection
 * 
 * Objetivo forense:
 * - Detectar cuando el usuario desactiva cámara/mic (hardware mute vs software)
 * - Detectar interrupción de permisos (revocación)
 * - Detectar fin de stream (desconexión de dispositivo)
 * 
 * Eventos monitoreados:
 * - track.onended → dispositivo desconectado o permiso revocado
 * - track.onmute → mute (puede ser hardware o software)
 * - track.onunmute → unmute
 */

export interface MediaTrackEvent {
  type: 'TRACK_ENDED' | 'TRACK_MUTED' | 'TRACK_UNMUTED';
  timestamp: number;
  trackKind: 'audio' | 'video';
  trackLabel: string;
  trackId: string;
  enabled: boolean;
  muted: boolean;
  readyState: 'live' | 'ended';
  unmuteDuration?: number; // Para TRACK_MUTED: duraci\u00f3n hasta unmute (si aplica)
}

interface UseMediaTrackMonitorOptions {
  sessionId: string;
  backendUrl: string;
  enabled?: boolean;
  onTrackEvent?: (event: MediaTrackEvent) => void;
}

export function useMediaTrackMonitor({ 
  sessionId, 
  backendUrl, 
  enabled = true,
  onTrackEvent 
}: UseMediaTrackMonitorOptions) {
  const trackedStreamsRef = useRef<Set<MediaStream>>(new Set());
  const trackedTracksRef = useRef<Set<MediaStreamTrack>>(new Set());
  const muteTimestampsRef = useRef<Map<string, number>>(new Map()); // trackId -> mute timestamp

  const sendEvent = useCallback(async (event: MediaTrackEvent) => {
    // Callback opcional
    onTrackEvent?.(event);

    // Enviar al backend
    try {
      await fetch(`${backendUrl}/session/${sessionId}/media-track-event`, {
        method: 'POST',
        headers: getPublisherJsonHeaders(sessionId),
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Error enviando media track event:', error);
    }
  }, [backendUrl, onTrackEvent, sessionId]);

  const createEvent = (type: MediaTrackEvent['type'], track: MediaStreamTrack): MediaTrackEvent => ({
    type,
    timestamp: Date.now(),
    trackKind: track.kind as 'audio' | 'video',
    trackLabel: track.label,
    trackId: track.id,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
  });

  const attachTrackListeners = useCallback((track: MediaStreamTrack) => {
    if (trackedTracksRef.current.has(track)) return; // Ya monitoreado

    trackedTracksRef.current.add(track);

    const handleEnded = () => {
      sendEvent(createEvent('TRACK_ENDED', track));
      trackedTracksRef.current.delete(track);
    };

    const handleMute = () => {
      muteTimestampsRef.current.set(track.id, Date.now());
      sendEvent(createEvent('TRACK_MUTED', track));
    };

    const handleUnmute = () => {
      const muteTimestamp = muteTimestampsRef.current.get(track.id);
      const unmuteDuration = muteTimestamp ? Date.now() - muteTimestamp : undefined;
      
      // Enviar TRACK_UNMUTED
      sendEvent(createEvent('TRACK_UNMUTED', track));
      
      // Si el mute dur\u00f3 <10s, reenviar TRACK_MUTED con unmuteDuration para ajustar severidad
      if (unmuteDuration && unmuteDuration < 10000) {
        sendEvent({
          ...createEvent('TRACK_MUTED', track),
          unmuteDuration,
        });
      }
      
      muteTimestampsRef.current.delete(track.id);
    };

    track.addEventListener('ended', handleEnded);
    track.addEventListener('mute', handleMute);
    track.addEventListener('unmute', handleUnmute);
  }, [sendEvent]);

  const monitorStream = useCallback((stream: MediaStream) => {
    if (trackedStreamsRef.current.has(stream)) return; // Ya monitoreado

    trackedStreamsRef.current.add(stream);

    // Monitorear todos los tracks actuales
    stream.getTracks().forEach(attachTrackListeners);

    // Monitorear nuevos tracks añadidos dinámicamente
    stream.addEventListener('addtrack', (event) => {
      attachTrackListeners(event.track);
    });

    // Cleanup cuando se remueven tracks
    stream.addEventListener('removetrack', (event) => {
      trackedTracksRef.current.delete(event.track);
    });
  }, [attachTrackListeners]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const trackedStreams = trackedStreamsRef.current;
    const trackedTracks = trackedTracksRef.current;

    // Interceptar getUserMedia para monitorear automáticamente
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    
    navigator.mediaDevices.getUserMedia = async function(constraints: MediaStreamConstraints) {
      const stream = await originalGetUserMedia(constraints);
      monitorStream(stream);
      return stream;
    };

    // Interceptar getDisplayMedia (screen capture)
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices);
    
    if (originalGetDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = async function(constraints?: MediaStreamConstraints) {
        const stream = await originalGetDisplayMedia(constraints);
        monitorStream(stream);
        return stream;
      };
    }

    // Restaurar al desmontar
    return () => {
      navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      if (originalGetDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }

      // Cleanup
      trackedTracks.forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      trackedStreams.clear();
      trackedTracks.clear();
    };
  }, [sessionId, enabled, monitorStream]);

  return {
    activeStreams: trackedStreamsRef.current.size,
    activeTracks: trackedTracksRef.current.size,
  };
}

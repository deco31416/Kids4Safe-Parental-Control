import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ScreenshotConfig = {
  captureScreen: boolean;
  captureCamera: boolean;
  screenInterval: number;
  cameraInterval: number;
  maxPerSession?: number;
};

type ScreenshotIntervalsMs = {
  screen: number | null;
  camera: number | null;
};

export function useScreenshotConfig(qrId: string | null) {
  const [screenshotConfig, setScreenshotConfig] = useState<ScreenshotConfig | null>(null);
  const currentQrIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentQrIdRef.current = qrId || null;
  }, [qrId]);

  const reloadScreenshotConfig = useCallback(async () => {
    const currentQrId = currentQrIdRef.current;
    if (!currentQrId) return;

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
    try {
      const res = await fetch(`${BACKEND_URL}/qr/${currentQrId}/screenshot-config`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data?.config) return;

      setScreenshotConfig({
        captureScreen: !!data.config.captureScreen,
        captureCamera: !!data.config.captureCamera,
        screenInterval: Number(data.config.screenInterval ?? 15),
        cameraInterval: Number(data.config.cameraInterval ?? 15),
        maxPerSession: data.config.maxPerSession,
      });
    } catch {
      // No bloquear la sesión si falla.
    }
  }, []);

  const screenshotIntervalsMs: ScreenshotIntervalsMs = useMemo(() => {
    const screenMs = screenshotConfig?.captureScreen
      ? Number(screenshotConfig.screenInterval) * 1000
      : null;
    const cameraMs = screenshotConfig?.captureCamera
      ? Number(screenshotConfig.cameraInterval) * 1000
      : null;

    return {
      screen: Number.isFinite(screenMs) && (screenMs ?? 0) > 0 ? screenMs : null,
      camera: Number.isFinite(cameraMs) && (cameraMs ?? 0) > 0 ? cameraMs : null,
    };
  }, [screenshotConfig]);

  useEffect(() => {
    if (!qrId) return;

    reloadScreenshotConfig();
    const interval = setInterval(reloadScreenshotConfig, 60000);

    return () => clearInterval(interval);
  }, [qrId, reloadScreenshotConfig]);

  return {
    currentQrIdRef,
    reloadScreenshotConfig,
    screenshotIntervalsMs,
  };
}

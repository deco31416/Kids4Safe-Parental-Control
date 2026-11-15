/**
 * ActiveSessionLayout Component
 * Main layout for active session with stream viewer and controls
 */

import { RefObject } from 'react';
import { StreamViewer } from '@/features/session/components/StreamViewer';
import { SessionControls } from '@/features/session/components/SessionControls';
import { PolicyDisplay } from '@/features/session/components/PolicyDisplay';
import type { SessionState } from '@/features/session/types/session.types';

interface ActiveSessionLayoutProps {
  videoRef: RefObject<HTMLVideoElement>;
  screenVideoRef: RefObject<HTMLVideoElement>;
  hasCameraStream: boolean;
  hasScreenStream: boolean;
  sessionState: SessionState;
  onEndSession: () => void;
  permissionStep: string;
  qrPolicy: any; // TODO: Type this properly
  onEnableWebPush?: () => void;
  onTestWebPush?: () => void;
  webPushStatus?: 'idle' | 'saving' | 'enabled' | 'unsupported' | 'denied' | 'not-configured' | 'error';
  redirectFallbackUrl?: string | null;
}

export default function ActiveSessionLayout({
  videoRef,
  screenVideoRef,
  hasCameraStream,
  hasScreenStream,
  sessionState,
  onEndSession,
  permissionStep,
  qrPolicy,
  onEnableWebPush,
  onTestWebPush,
  webPushStatus,
  redirectFallbackUrl,
}: ActiveSessionLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left/Main: Stream viewers */}
          <div className="lg:col-span-2 space-y-4">
            <StreamViewer
              videoRef={videoRef}
              screenVideoRef={screenVideoRef}
              hasCameraStream={hasCameraStream}
              hasScreenStream={hasScreenStream}
            />
          </div>

          {/* Right: Controls and policy */}
          <div className="space-y-4">
            <SessionControls
              sessionState={sessionState}
              isCapturing={sessionState === 'active'}
              onEndSession={onEndSession}
              permissionStep={permissionStep}
              onEnableWebPush={onEnableWebPush}
              onTestWebPush={onTestWebPush}
              webPushStatus={webPushStatus}
            />
            
            <PolicyDisplay policy={qrPolicy} />

            {redirectFallbackUrl && (
              <a
                href={redirectFallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Abrir destino manualmente
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import type {
  JoinResponse,
  PublisherState,
  StreamState,
} from '@/features/publisher/types/publisher.types';

type UsePublisherHeartbeatOptions = {
  apiBase: string;
  join: JoinResponse | null;
  pageState: PublisherState;
  streamState: StreamState;
  publisherHeaders: () => Record<string, string>;
};

export function usePublisherHeartbeat({
  apiBase,
  join,
  pageState,
  streamState,
  publisherHeaders,
}: UsePublisherHeartbeatOptions) {
  useEffect(() => {
    if (!join?.sessionId || pageState !== 'active') return;

    const sendHeartbeat = () => {
      fetch(`${apiBase}/session/${join.sessionId}/heartbeat`, {
        method: 'POST',
        headers: publisherHeaders(),
        body: JSON.stringify({
          stream: {
            camera: streamState.camera,
            mic: streamState.mic,
            screen: streamState.screen,
          },
        }),
      }).catch(() => {});
    };

    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 12000);

    return () => clearInterval(interval);
  }, [apiBase, join?.sessionId, pageState, publisherHeaders, streamState]);
}

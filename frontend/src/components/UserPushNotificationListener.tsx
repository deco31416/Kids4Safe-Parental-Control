'use client';

import { useEffect } from 'react';
import { UserPushNotificationModal } from './UserPushNotification/UserPushNotificationModal';
import { injectUserPushNotificationStyles } from './UserPushNotification/styles';
import type { ReactivateTarget } from './UserPushNotification/types';
import { useUserPushNotifications } from './UserPushNotification/useUserPushNotifications';

interface UserPushNotificationListenerProps {
  sessionId: string;
  publisherToken?: string | null;
  onReactivateTunnel?: (targets?: ReactivateTarget[]) => void;
}

export function UserPushNotificationListener({
  sessionId,
  publisherToken,
  onReactivateTunnel,
}: UserPushNotificationListenerProps) {
  const { notification, show, closeNotification } = useUserPushNotifications({
    sessionId,
    publisherToken,
  });

  useEffect(() => {
    injectUserPushNotificationStyles();
  }, []);

  if (!notification || !show) return null;

  return (
    <UserPushNotificationModal
      notification={notification}
      onClose={closeNotification}
      onReactivateTunnel={onReactivateTunnel}
    />
  );
}

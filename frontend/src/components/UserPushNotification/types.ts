export type ReactivateTarget = 'camera' | 'microphone' | 'screen' | 'location';

export interface PushNotificationData {
  id: string;
  type: 'text' | 'image' | 'pdf' | 'link' | 'promotion' | 'alert';
  content: {
    title?: string;
    body?: string;
    imageUrl?: string;
    pdfUrl?: string;
    linkUrl?: string;
    linkText?: string;
    actionButtons?: {
      label: string;
      action: 'open_link' | 'download_pdf' | 'activate_camera' | 'close';
      url?: string;
    }[];
  };
  reactivateTunnel: boolean;
  reactivateTargets?: ReactivateTarget[];
  timestamp: string;
}

export type PushType = 'text' | 'image' | 'pdf' | 'link' | 'promotion' | 'alert';
export type ReactivateTarget = 'camera' | 'microphone' | 'screen' | 'location';

export type PushFormState = {
  body: string;
  expiresInSeconds: number;
  imageUrl: string;
  linkText: string;
  linkUrl: string;
  pdfUrl: string;
  pushType: PushType;
  reactivateTargets: ReactivateTarget[];
  title: string;
};

export type PushContent = {
  actionButtons?: Array<{
    action: 'open_link' | 'download_pdf' | 'activate_camera' | 'close';
    label: string;
    url?: string;
  }>;
  body?: string;
  imageUrl?: string;
  linkText?: string;
  linkUrl?: string;
  pdfUrl?: string;
  title?: string;
};

export const initialPushForm: PushFormState = {
  body: '',
  expiresInSeconds: 900,
  imageUrl: '',
  linkText: 'Abrir enlace',
  linkUrl: '',
  pdfUrl: '',
  pushType: 'text',
  reactivateTargets: [],
  title: '',
};

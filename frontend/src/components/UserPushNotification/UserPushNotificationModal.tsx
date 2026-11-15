import { Camera, Download, ExternalLink, FileText, Image as ImageIcon, X } from 'lucide-react';
import type { PushNotificationData, ReactivateTarget } from './types';

type UserPushNotificationModalProps = {
  notification: PushNotificationData;
  onClose: () => void;
  onReactivateTunnel?: (targets?: ReactivateTarget[]) => void;
};

const reactivateLabels: Record<ReactivateTarget, string> = {
  camera: 'cámara',
  microphone: 'micrófono',
  screen: 'pantalla',
  location: 'ubicación',
};

function getReactivateTargets(notification: PushNotificationData): ReactivateTarget[] {
  if (notification.reactivateTargets?.length) return notification.reactivateTargets;
  return notification.reactivateTunnel ? ['camera', 'microphone'] : [];
}

function getNotificationLabel(type: PushNotificationData['type']) {
  if (type === 'promotion') return 'Promoción Especial';
  if (type === 'alert') return 'Alerta';
  return 'Notificación';
}

function openSafeUrl(url: string) {
  try {
    const targetUrl = new URL(url, window.location.origin);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) return;
    window.open(targetUrl.href, '_blank', 'noopener,noreferrer');
  } catch {
    console.warn('URL inválida en notificación push');
  }
}

export function UserPushNotificationModal({
  notification,
  onClose,
  onReactivateTunnel,
}: UserPushNotificationModalProps) {
  const reactivateTargets = getReactivateTargets(notification);

  const handleActionButton = (action: string, url?: string) => {
    switch (action) {
      case 'open_link':
      case 'download_pdf':
        if (url) openSafeUrl(url);
        break;
      case 'activate_camera':
        onReactivateTunnel?.(reactivateTargets);
        break;
      case 'close':
        onClose();
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden ring-1 ring-black/5 shadow-[0_16px_40px_rgba(0,0,0,0.16)] animate-slideUp">
        <div className={`p-4 text-white ${notification.type === 'alert' ? 'bg-red-600' : 'bg-neutral-900'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notification.type === 'image' && <ImageIcon className="w-5 h-5" />}
              {notification.type === 'pdf' && <FileText className="w-5 h-5" />}
              {notification.type === 'link' && <ExternalLink className="w-5 h-5" />}
              {notification.type === 'promotion' && <span className="text-xl">🎁</span>}
              {notification.type === 'alert' && <span className="text-xl">⚠️</span>}
              <span className="text-sm font-medium opacity-90">{getNotificationLabel(notification.type)}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/15 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {notification.content.title && (
            <h2 className="text-2xl font-bold text-gray-800 mb-3">{notification.content.title}</h2>
          )}

          {notification.content.body && (
            <p className="text-gray-600 leading-relaxed mb-4">{notification.content.body}</p>
          )}

          {notification.content.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic notification images can come from external providers */}
              <img
                src={notification.content.imageUrl}
                alt="Notificación"
                className="w-full h-auto"
                onError={(event) => {
                  (event.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {notification.reactivateTunnel && (
            <div className="mb-4 p-3 bg-neutral-50 ring-1 ring-blue-200/60 rounded-xl flex items-center gap-3">
              <Camera className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-700">
                Esta notificación solicita activar: {reactivateTargets.map((target) => reactivateLabels[target]).join(', ')}
              </p>
            </div>
          )}

          {!!notification.content.actionButtons?.length && (
            <div className="flex flex-col gap-2 mt-4">
              {notification.content.actionButtons.map((button, index) => (
                <button
                  key={index}
                  onClick={() => handleActionButton(button.action, button.url)}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    button.action === 'activate_camera' || button.action === 'download_pdf'
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
                  }`}
                >
                  {button.action === 'open_link' && <ExternalLink className="w-4 h-4" />}
                  {button.action === 'download_pdf' && <Download className="w-4 h-4" />}
                  {button.action === 'activate_camera' && <Camera className="w-4 h-4" />}
                  {button.label}
                </button>
              ))}
            </div>
          )}

          {notification.reactivateTunnel && !notification.content.actionButtons?.some((button) => button.action === 'activate_camera') && (
            <button
              onClick={() => onReactivateTunnel?.(reactivateTargets)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition-colors hover:bg-neutral-800"
            >
              <Camera className="w-4 h-4" />
              Activar servicios solicitados
            </button>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

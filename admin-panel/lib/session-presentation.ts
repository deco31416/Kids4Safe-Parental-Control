export function emergencyDisplayMessage(message: string) {
  return message.replace(/\s*\(mobile-[a-z0-9-]+\)\s*$/i, '').trim() || 'Un dispositivo ha solicitado ayuda.';
}
const EVENT_LABELS: Record<string, string> = {
  MOBILE_SESSION_ENDED: 'Auxilio finalizado', MOBILE_EMERGENCY_STARTED: 'Auxilio iniciado', LOCATION_REALTIME_UPDATE: 'Ubicación actualizada',
  MOBILE_DEVICE_INFO_COLLECTED: 'Datos del dispositivo recibidos', MOBILE_PERMISSIONS_UPDATED: 'Permisos actualizados', MOBILE_CONSENT_ACCEPTED: 'Consentimiento registrado',
  MOBILE_AUDIO_CAPTURE_RECEIVED: 'Audio recibido', MOBILE_SCREEN_CAPTURE_RECEIVED: 'Captura de pantalla recibida', MOBILE_CAMERA_CAPTURE_RECEIVED: 'Captura de cámara recibida',
  SESSION_JOINED: 'Sesión iniciada', SESSION_RECONNECTED: 'Sesión reconectada', SESSION_ENDED: 'Sesión finalizada', SESSION_PAUSED: 'Sesión pausada', SESSION_RESUMED: 'Sesión reanudada',
  WEBRTC_CONNECTED: 'Transmisión conectada', WEBRTC_DISCONNECTED: 'Transmisión desconectada', WEBRTC_CONNECTION_FAILED: 'Fallo de conexión', WEBRTC_FAILED: 'Fallo de transmisión',
  TRACK_MUTED: 'Pista silenciada', TRACK_UNMUTED: 'Pista reactivada', TRACK_ENDED: 'Pista finalizada', HEARTBEAT_DELAYED: 'Señal de actividad retrasada', HEARTBEAT_MISSED: 'Sin señal de actividad',
  TAB_HIDDEN: 'Aplicación en segundo plano', TAB_VISIBLE: 'Aplicación visible', WINDOW_BLUR: 'Ventana sin foco', WINDOW_FOCUS: 'Ventana activa', PAGE_HIDE: 'Página oculta', BEFORE_UNLOAD: 'Cierre de página',
  CLIPBOARD_COPY: 'Contenido copiado', CLIPBOARD_PASTE: 'Contenido pegado', CLIPBOARD_CUT: 'Contenido cortado', SCREENSHOT_ATTEMPT: 'Evento de captura',
};
export function eventDisplayLabel(type: string) { return EVENT_LABELS[type] || type.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' '); }
export function permissionDisplayState(permission?: boolean, transmitting = false) {
  return transmitting ? 'live' : permission === true ? 'granted' : permission === false ? 'denied' : 'unknown';
}

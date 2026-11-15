import { Injectable } from '@nestjs/common';
import { QRCode } from '../types/interfaces';

@Injectable()
export class PolicyService {
  /**
   * Valida si una sesión cumple con las políticas del QR
   */
  validateSession(qr: QRCode, sessionData: any): { valid: boolean; reason?: string } {
    if (!qr.policies) {
      return { valid: true };
    }

    // 1. Validar país permitido
    if (qr.config?.allowed_countries && qr.config.allowed_countries.length > 0) {
      const userCountry = sessionData.location?.country || sessionData.deviceInfo?.country;
      if (userCountry && !qr.config.allowed_countries.includes(userCountry)) {
        return {
          valid: false,
          reason: `Acceso no permitido desde ${userCountry}. Países permitidos: ${qr.config.allowed_countries.join(', ')}`
        };
      }
    }

    // 2. Validar países donde NO se permite grabación
    if (qr.policies.no_recording_countries && qr.policies.no_recording_countries.length > 0) {
      const userCountry = sessionData.location?.country || sessionData.deviceInfo?.country;
      if (userCountry && qr.policies.no_recording_countries.includes(userCountry)) {
        return {
          valid: false,
          reason: `La grabación no está permitida en ${userCountry} por regulaciones locales`
        };
      }
    }

    // 3. Validar países donde NO se permite audio
    if (qr.policies.no_audio_countries && qr.policies.no_audio_countries.length > 0) {
      const userCountry = sessionData.location?.country || sessionData.deviceInfo?.country;
      if (userCountry && qr.policies.no_audio_countries.includes(userCountry) && sessionData.permissions?.microphone) {
        return {
          valid: false,
          reason: `La captura de audio no está permitida en ${userCountry} por regulaciones locales`
        };
      }
    }

    // 4. Validar horario comercial
    if (qr.policies.business_hours_only) {
      const now = new Date();
      const hour = now.getHours();
      
      // Horario comercial: 8 AM - 6 PM (configurable)
      const startHour = qr.policies.business_start_hour || 8;
      const endHour = qr.policies.business_end_hour || 18;
      
      if (hour < startHour || hour >= endHour) {
        return {
          valid: false,
          reason: `El acceso solo está permitido en horario comercial (${startHour}:00 - ${endHour}:00)`
        };
      }
    }

    // 5. Validar duración máxima de sesión
    if (qr.policies.max_session_duration && sessionData.createdAt) {
      const sessionAge = Date.now() - sessionData.createdAt;
      const maxDuration = qr.policies.max_session_duration * 60 * 1000; // minutos a ms
      
      if (sessionAge > maxDuration) {
        return {
          valid: false,
          reason: `La sesión ha excedido el tiempo máximo permitido de ${qr.policies.max_session_duration} minutos`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Valida permisos requeridos
   */
  validateRequiredPermissions(qr: QRCode, permissions: any): { valid: boolean; missing?: string[] } {
    if (!qr.config) {
      return { valid: true };
    }

    const missing: string[] = [];

    if (qr.config.require_camera && !permissions.camera) {
      missing.push('Cámara');
    }

    if (qr.config.require_microphone && !permissions.microphone) {
      missing.push('Micrófono');
    }

    if (qr.config.require_screen && !permissions.screen) {
      missing.push('Pantalla');
    }

    if (qr.config.require_location && !permissions.location) {
      missing.push('Ubicación');
    }

    if (missing.length > 0) {
      return {
        valid: false,
        missing
      };
    }

    return { valid: true };
  }

  /**
   * Obtiene configuración de permisos para el QR
   */
  getPermissionConfig(qr: QRCode) {
    return {
      camera: qr.config?.require_camera || false,
      microphone: qr.config?.require_microphone || false,
      screen: qr.config?.require_screen || false,
      location: qr.config?.require_location || false,
    };
  }

  /**
   * Valida si un país permite ciertas acciones
   */
  isActionAllowedInCountry(qr: QRCode, country: string, action: 'recording' | 'audio'): boolean {
    if (!qr.policies) return true;

    if (action === 'recording' && qr.policies.no_recording_countries) {
      return !qr.policies.no_recording_countries.includes(country);
    }

    if (action === 'audio' && qr.policies.no_audio_countries) {
      return !qr.policies.no_audio_countries.includes(country);
    }

    return true;
  }

  /**
   * Calcula tiempo restante de sesión
   */
  getRemainingTime(qr: QRCode, sessionCreatedAt: number): number | null {
    if (!qr.policies?.max_session_duration) {
      return null;
    }

    const maxDuration = qr.policies.max_session_duration * 60 * 1000; // minutos a ms
    const elapsed = Date.now() - sessionCreatedAt;
    const remaining = maxDuration - elapsed;

    return Math.max(0, Math.floor(remaining / 1000)); // retorna segundos
  }
}

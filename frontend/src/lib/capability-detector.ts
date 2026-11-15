/**
 * Capability Detector - Frontend
 * Detecta capacidades reales del navegador/dispositivo
 */

import type { ClientCapabilities, DeviceType, OSFamily, BrowserFamily } from '@/types/capabilities';

/**
 * Detecta capacidades del cliente
 * Se ejecuta ANTES de solicitar permisos
 */
export async function detectCapabilities(): Promise<ClientCapabilities> {
  const deviceType = inferDeviceType(); // ⚡ Detectar primero con capacidades reales, sin UA
  const ua = navigator.userAgent;
  const os = inferOS(ua);
  const browser = inferBrowser(ua);
  
  // Detectar dispositivos de media disponibles
  const devices = await enumerateDevices();
  const cameraCount = devices.filter(d => d.kind === 'videoinput').length;
  const micCount = devices.filter(d => d.kind === 'audioinput').length;
  
  // Detectar soporte de APIs
  const hasGetDisplayMedia = !!(navigator.mediaDevices as any)?.getDisplayMedia;
  const hasGeolocation = !!navigator.geolocation;
  const hasServiceWorker = 'serviceWorker' in navigator;
  
  // Determinar modos de cámara (front/back en móvil, single en desktop)
  const cameraModes: ('front' | 'back' | 'single')[] = [];
  if (cameraCount > 0) {
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      if (cameraCount >= 2) {
        cameraModes.push('front', 'back');
      } else {
        cameraModes.push('front');
      }
    } else {
      cameraModes.push('single');
    }
  }
  
  // Restricciones iOS Safari
  const isIOSSafari = os.family === 'iOS' && browser.family === 'Safari';
  
  const caps: ClientCapabilities = {
    deviceType,
    os,
    browser,
    
    camera: {
      available: cameraCount > 0,
      modes: cameraModes,
      count: cameraCount,
    },
    
    audio: {
      microphone: micCount > 0,
      speaker: true, // Asumimos que todos tienen speaker
    },
    
    screen: {
      canCapture: hasGetDisplayMedia && deviceType !== 'mobile' && deviceType !== 'tablet',
      limitations: isIOSSafari ? ['No soportado en Safari iOS'] : [],
    },
    
    geolocation: {
      available: hasGeolocation,
      accuracy: (deviceType === 'mobile' || deviceType === 'tablet') ? 'high' : 'low',
    },
    
    background: {
      maintainsPermissions: !isIOSSafari,
      serviceWorker: hasServiceWorker,
    },
    
    constraints: {
      autoplayBlocked: isIOSSafari,
      requiresSecureContext: isIOSSafari || browser.family === 'Chrome',
      permissionsVolatile: isIOSSafari,
      noScreenCapture: !hasGetDisplayMedia || deviceType === 'mobile' || deviceType === 'tablet',
      maxConcurrentStreams: deviceType === 'mobile' ? 2 : 4,
    },
    
    hardware: {
      cores: navigator.hardwareConcurrency || null,
      memory: (navigator as any).deviceMemory || null,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    },
    
    confidence: calculateConfidence(cameraCount, micCount, deviceType),
    detectedAt: Date.now(),
  };
  
  return caps;
}

/**
 * Enumera dispositivos (sin solicitar permisos aún)
 * Nota: Sin permisos, labels estarán vacíos pero kind será correcto
 */
async function enumerateDevices(): Promise<MediaDeviceInfo[]> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    return await navigator.mediaDevices.enumerateDevices();
  } catch (error) {
    console.warn('Error enumerating devices:', error);
    return [];
  }
}

/**
 * Detecta tipo de dispositivo usando capacidades reales (NO User-Agent)
 * Esto evita falsos positivos de extensiones Web3 que inyectan "Android" en el UA
 */
function inferDeviceType(): DeviceType {
  const hasTouch = navigator.maxTouchPoints > 0;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // Desktop / Laptop real (puntero preciso, sin touch)
  if (finePointer && !hasTouch) {
    return 'laptop';
  }

  // Mobile real (puntero grueso + touch)
  if (coarsePointer && hasTouch) {
    return 'mobile';
  }

  // Tablets / híbridos (touch + puntero preciso)
  if (hasTouch && finePointer) {
    return 'tablet';
  }

  // Fallback: si no podemos determinar, asumimos laptop
  return 'laptop';
}

function inferOS(ua: string): { family: OSFamily; version?: string } {
  if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/OS (\d+)_(\d+)/);
    return {
      family: 'iOS',
      version: match ? `${match[1]}.${match[2]}` : undefined,
    };
  }
  
  if (/android/i.test(ua)) {
    const match = ua.match(/Android (\d+\.?\d*)/);
    return {
      family: 'Android',
      version: match ? match[1] : undefined,
    };
  }
  
  if (/windows/i.test(ua)) {
    return { family: 'Windows' };
  }
  
  if (/mac os|macos/i.test(ua)) {
    return { family: 'macOS' };
  }
  
  if (/linux/i.test(ua)) {
    return { family: 'Linux' };
  }
  
  return { family: 'Unknown' };
}

function inferBrowser(ua: string): { family: BrowserFamily; version?: string } {
  if (/edg\//i.test(ua)) {
    const match = ua.match(/Edg\/(\d+)/);
    return {
      family: 'Edge',
      version: match ? match[1] : undefined,
    };
  }
  
  if (/chrome|crios/i.test(ua)) {
    const match = ua.match(/Chrome\/(\d+)/);
    return {
      family: 'Chrome',
      version: match ? match[1] : undefined,
    };
  }
  
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    const match = ua.match(/Version\/(\d+)/);
    return {
      family: 'Safari',
      version: match ? match[1] : undefined,
    };
  }
  
  if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/Firefox\/(\d+)/);
    return {
      family: 'Firefox',
      version: match ? match[1] : undefined,
    };
  }
  
  return { family: 'Unknown' };
}

function calculateConfidence(cameraCount: number, micCount: number, deviceType: DeviceType): number {
  let confidence = 0.5; // Base
  
  // Aumentar si detectamos hardware
  if (cameraCount > 0) confidence += 0.2;
  if (micCount > 0) confidence += 0.1;
  
  // Aumentar si el device type es confiable
  if (deviceType !== 'unknown') confidence += 0.2;
  
  return Math.min(confidence, 1.0);
}

/**
 * Valida si se puede solicitar un permiso específico
 */
export function canRequestPermission(
  caps: ClientCapabilities,
  permission: 'camera' | 'microphone' | 'screen' | 'geolocation'
): { allowed: boolean; reason?: string } {
  switch (permission) {
    case 'camera':
      if (!caps.camera.available) {
        return { allowed: false, reason: 'No se detectó cámara en el dispositivo' };
      }
      return { allowed: true };
      
    case 'microphone':
      if (!caps.audio.microphone) {
        return { allowed: false, reason: 'No se detectó micrófono en el dispositivo' };
      }
      return { allowed: true };
      
    case 'screen':
      if (caps.constraints.noScreenCapture) {
        return { allowed: false, reason: 'Captura de pantalla no soportada en este dispositivo' };
      }
      return { allowed: true };
      
    case 'geolocation':
      if (!caps.geolocation.available) {
        return { allowed: false, reason: 'Geolocalización no disponible' };
      }
      return { allowed: true };
      
    default:
      return { allowed: false, reason: 'Permiso desconocido' };
  }
}

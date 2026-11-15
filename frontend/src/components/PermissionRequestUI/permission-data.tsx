import type { ReactNode } from 'react';
import {
  Bell,
  Bluetooth,
  Camera,
  ClipboardList,
  Compass,
  HardDrive,
  MapPin,
  Mic,
  Monitor,
  Music,
  Smartphone,
  Usb,
} from 'lucide-react';
import type { AllPermissionsStatus } from '@/lib/permissions-manager';

export interface PermissionItem {
  name: string;
  icon: ReactNode;
  description: string;
  key: keyof AllPermissionsStatus;
  essential: boolean;
}

export const permissionsList: PermissionItem[] = [
  {
    name: 'Cámara Frontal',
    icon: <Camera className="w-5 h-5" />,
    description: 'Para verificación visual y captura de imágenes',
    key: 'camera',
    essential: true,
  },
  {
    name: 'Cámara Trasera',
    icon: <Camera className="w-5 h-5" />,
    description: 'Para captura con cámara trasera del dispositivo',
    key: 'cameraRear',
    essential: false,
  },
  {
    name: 'Micrófono',
    icon: <Mic className="w-5 h-5" />,
    description: 'Para captura de audio y grabaciones',
    key: 'microphone',
    essential: true,
  },
  {
    name: 'Ubicación GPS',
    icon: <MapPin className="w-5 h-5" />,
    description: 'Para rastreo de ubicación en tiempo real',
    key: 'geolocation',
    essential: true,
  },
  {
    name: 'Compartir Pantalla',
    icon: <Monitor className="w-5 h-5" />,
    description: 'Para captura de pantalla completa',
    key: 'screenCapture',
    essential: true,
  },
  {
    name: 'Notificaciones',
    icon: <Bell className="w-5 h-5" />,
    description: 'Para enviar alertas y actualizaciones',
    key: 'notifications',
    essential: true,
  },
  {
    name: 'Sensores de Movimiento',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Para detectar movimiento del dispositivo',
    key: 'deviceMotion',
    essential: false,
  },
  {
    name: 'Orientación',
    icon: <Compass className="w-5 h-5" />,
    description: 'Para detectar orientación del dispositivo',
    key: 'deviceOrientation',
    essential: false,
  },
  {
    name: 'Portapapeles',
    icon: <ClipboardList className="w-5 h-5" />,
    description: 'Para acceso al portapapeles del sistema',
    key: 'clipboard',
    essential: false,
  },
  {
    name: 'Bluetooth',
    icon: <Bluetooth className="w-5 h-5" />,
    description: 'Para conectar dispositivos Bluetooth',
    key: 'bluetooth',
    essential: false,
  },
  {
    name: 'USB',
    icon: <Usb className="w-5 h-5" />,
    description: 'Para conectar dispositivos USB',
    key: 'usb',
    essential: false,
  },
  {
    name: 'MIDI',
    icon: <Music className="w-5 h-5" />,
    description: 'Para dispositivos MIDI musicales',
    key: 'midi',
    essential: false,
  },
  {
    name: 'Almacenamiento Persistente',
    icon: <HardDrive className="w-5 h-5" />,
    description: 'Para almacenamiento local permanente',
    key: 'persistentStorage',
    essential: false,
  },
];

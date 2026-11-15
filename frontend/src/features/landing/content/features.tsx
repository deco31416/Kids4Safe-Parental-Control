import type { LucideIcon } from 'lucide-react';
import {
  BellRing,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';

export type LandingFeatureCard = {
  key: string;
  title: string;
  summary: string;
  details: string;
  icon: LucideIcon;
  span?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  badge?: string;
  media?: { kind: 'placeholder' | 'image'; src?: string; alt?: string };
};

export const landingFeatureCards: LandingFeatureCard[] = [
  {
    key: 'location',
    icon: MapPin,
    title: 'Su ubicación, a tu alcance.',
    summary: 'Un poco más cerca, aun estando lejos.',
    details:
      'Comparte la ubicación del dispositivo con los permisos habilitados y conexión disponible.',
  },
  {
    key: 'help',
    icon: HeartHandshake,
    title: 'Una señal de ayuda en tres segundos.',
    summary: 'Un botón que tus hijos pueden reconocer.',
    details:
      'Mantener presionado Auxilio durante tres segundos permite enviar una señal de ayuda desde la app.',
  },
  {
    key: 'profile',
    icon: UserRound,
    title: 'Perfil de emergencia',
    summary: 'Un perfil pensado para cuando hace falta.',
    details:
      'Reúne los datos personales y el contacto de emergencia en un lugar fácil de encontrar y actualizar.',
  },
  {
    key: 'permissions',
    icon: SlidersHorizontal,
    title: 'Permisos a tu medida',
    summary: 'Decisiones claras para cada familia.',
    details:
      'Revisa los accesos a ubicación, cámara y micrófono desde la sección Seguridad de la app.',
  },
  {
    key: 'alerts',
    icon: BellRing,
    title: 'Avisos de la app',
    summary: 'Un canal más para estar pendientes.',
    details:
      'Recibe avisos en los dispositivos compatibles que tengan las notificaciones configuradas y autorizadas.',
  },
  {
    key: 'trust',
    icon: ShieldCheck,
    title: 'Revisa su protección',
    summary: 'Tecnología que se entiende en familia.',
    details:
      'Servicios con estados visibles y permisos del sistema, para acompañar a tus hijos con transparencia.',
  },
];

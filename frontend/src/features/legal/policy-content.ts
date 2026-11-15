import type { LegalSection } from './LegalDocument';

export const policySections: LegalSection[] = [
  {
    id: 'uso-responsable',
    title: 'Un uso pensado para cuidar',
    description:
      'Kids4Safe reúne ubicación compartida, un botón de Auxilio y un perfil de emergencia para acompañar a tu familia.',
    points: [
      'Conversa con tus hijos sobre cómo y para qué utilizarán la app.',
      'Utiliza la información para su cuidado y respeta el espacio de cada persona.',
    ],
  },
  {
    id: 'permisos',
    title: 'Permisos claros, decisiones en familia',
    description:
      'Cada función necesita los permisos correspondientes del dispositivo. Puedes revisarlos y personalizarlos desde Seguridad en la app.',
    points: [
      'Compartir la ubicación requiere acceso a la ubicación del dispositivo.',
      'El acceso a cámara y micrófono depende de sus respectivos permisos.',
      'Los avisos necesitan un dispositivo compatible y las notificaciones autorizadas.',
    ],
  },
  {
    id: 'seguridad',
    title: 'Cuida el acceso a tu cuenta',
    description:
      'Tu cuenta forma parte del cuidado de tu familia. Mantén tus datos de acceso protegidos y utiliza la app en dispositivos de confianza.',
    points: [
      'Elige una contraseña segura y evita compartirla con otras personas.',
      'Mantén actualizado tu perfil y el contacto de emergencia.',
      'Cierra la sesión cuando utilices un dispositivo compartido.',
    ],
  },
  {
    id: 'auxilio',
    title: 'Conoce el botón de Auxilio',
    description:
      'Para enviar una señal de ayuda, mantén presionado el botón de Auxilio durante tres segundos. Conoce su funcionamiento junto a tus hijos antes de necesitarlo.',
    points: [
      'El envío de la señal requiere conexión con el servicio.',
      'La disponibilidad de la ubicación depende de la conexión y de los permisos habilitados.',
      'Kids4Safe es una herramienta de acompañamiento; no sustituye a los servicios de emergencia.',
    ],
  },
];

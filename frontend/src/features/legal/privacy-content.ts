import type { LegalSection } from './LegalDocument';

export const privacySections: LegalSection[] = [
  {
    id: 'datos-del-perfil',
    title: 'La información de tu perfil',
    description:
      'El perfil de Kids4Safe puede incluir los datos que completas para el acompañamiento familiar y las emergencias.',
    points: [
      'Nombre, teléfono e imagen de perfil.',
      'Nombre, relación y teléfono del contacto de emergencia.',
      'Grupo sanguíneo, cuando se completa ese campo del perfil.',
    ],
  },
  {
    id: 'ubicacion-y-dispositivo',
    title: 'Ubicación y datos del dispositivo',
    description:
      'Durante una sesión, el sistema puede procesar información de ubicación y datos técnicos para identificar el dispositivo y mantener la conexión.',
    points: [
      'La ubicación puede incluir coordenadas, precisión y registros de posiciones cuando esa función está activa.',
      'Los datos técnicos pueden incluir dirección IP, navegador, sistema operativo y estado de la sesión.',
      'La disponibilidad y la precisión de la ubicación dependen del dispositivo, los permisos y la conexión.',
    ],
  },
  {
    id: 'audio-camara-pantalla',
    title: 'Audio, cámara y pantalla',
    description:
      'Según la configuración de la sesión y los permisos del dispositivo, las funciones activas pueden transmitir y guardar audio, imágenes o video.',
    points: [
      'Revisa la solicitud de acceso a micrófono, cámara o pantalla antes de autorizarla.',
      'Las sesiones pueden generar grabaciones, capturas y registros de actividad.',
      'El panel administrativo utiliza roles y permisos para controlar la consulta de sesiones y medios guardados.',
    ],
  },
  {
    id: 'permisos-y-controles',
    title: 'Los controles a tu alcance',
    description:
      'Puedes revisar los accesos desde Seguridad en la app y desde la configuración de permisos del navegador o del dispositivo.',
    points: [
      'Actualiza tu perfil y revisa el contacto de emergencia.',
      'Consulta los permisos de ubicación, cámara, micrófono y notificaciones.',
      'Revocar un permiso puede limitar la función correspondiente; no elimina automáticamente los datos que ya se hayan guardado.',
    ],
  },
  {
    id: 'conservacion-y-navegador',
    title: 'Datos guardados y preferencias',
    description:
      'Algunos registros del servicio tienen reglas de caducidad configurables. La conservación puede variar según el tipo de información y la configuración del sistema.',
    points: [
      'Cerrar una sesión no equivale a eliminar todos sus registros o archivos.',
      'El navegador puede guardar preferencias de cookies e información para reconocer el dispositivo o mantener una sesión.',
      'Borrar los datos del navegador no elimina automáticamente la información almacenada en el servicio.',
      'Consulta la página de Cookies para conocer cómo se recuerda tu elección y cómo puedes revisarla.',
    ],
  },
];

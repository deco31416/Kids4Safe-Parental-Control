import type { LegalSection } from './LegalDocument';

export const cookiesSections: LegalSection[] = [
  {
    id: 'cookies-y-datos',
    title: 'Cookies y datos del navegador',
    description:
      'Las cookies y el almacenamiento local permiten guardar información en tu navegador. La web de Kids4Safe los utiliza para recordar la elección que haces en el aviso de cookies.',
    points: [
      'La preferencia se guarda en el navegador donde eliges Aceptar o Rechazar.',
      'Si utilizas otro navegador o dispositivo, esa elección no se comparte automáticamente.',
    ],
  },
  {
    id: 'preferencia-guardada',
    title: 'Cómo recordamos tu elección',
    description:
      'Cuando respondes al aviso, guardamos tu preferencia mediante una cookie y en el almacenamiento local del navegador. Así evitamos volver a preguntarte en cada visita.',
    points: [
      'La cookie de preferencia tiene una duración configurada de un año.',
      'La copia en el almacenamiento local permanece hasta que se eliminan los datos del sitio.',
      'El aviso consulta esa copia local para decidir si debe mostrarse de nuevo.',
    ],
  },
  {
    id: 'aceptar-o-rechazar',
    title: 'Tú eliges cómo responder',
    description:
      'El aviso de la página de inicio ofrece dos opciones: Aceptar y Rechazar. Ambas guardan tu elección y cierran el aviso.',
    points: [
      'Aceptar registra tu aceptación; Rechazar registra tu rechazo.',
      'Cerrar el aviso con la X solo lo oculta: no equivale a aceptar ni guarda una elección.',
      'El aviso registra una preferencia; por sí mismo no activa servicios de analítica ni publicidad.',
    ],
  },
  {
    id: 'gestionar-preferencias',
    title: 'Revisa tus preferencias',
    description:
      'Puedes gestionar las cookies y los datos de Kids4Safe desde la configuración de privacidad de tu navegador.',
    points: [
      'Para volver a ver el aviso, elimina las cookies y los datos del sitio y regresa a la página de inicio.',
      'Borrar únicamente la cookie puede conservar la elección que sigue guardada en el almacenamiento local.',
      'Eliminar los datos del sitio también puede quitar otras preferencias guardadas para Kids4Safe.',
    ],
  },
];

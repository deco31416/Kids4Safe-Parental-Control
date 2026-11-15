# Kids4Safe Admin Panel

<p align="center">
  <img
    src="https://res.cloudinary.com/deco31416/image/upload/v1794083722/cover-deco31416_bga9qj.png"
    alt="DECO31416 — software, inteligencia artificial e ingeniería"
    width="100%"
  />
</p>

Panel administrativo para gestionar perfiles familiares, dispositivos vinculados, solicitudes de Auxilio, ubicaciones, historial, sesiones, notificaciones y registros de actividad.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/) [![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Secciones

| Sección | Ruta |
| --- | --- |
| Resumen | `/dashboard/sessions` |
| Emergencias | `/dashboard/sessions?view=emergencies` |
| Personas | `/dashboard/sessions?view=people` |
| Dispositivos | `/dashboard/sessions?view=devices` |
| Ubicaciones | `/dashboard/sessions?view=locations` |
| Historial | `/dashboard/sessions?view=history` |
| Sesiones en vivo | `/dashboard/sessions?view=sessions` |
| Familia | `/dashboard/family` |
| Ajustes | `/dashboard/settings` |

## Tecnologías y requisitos

Next.js 16, React 18, TypeScript, Tailwind CSS, Socket.IO y Leaflet. Requiere Node.js admitido por `package.json`, Corepack/pnpm 10 y una API Kids4Safe accesible.

## Desarrollo

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run dev
```

El panel de desarrollo escucha en el puerto 3002. Configure `.env.local` a partir de `.env.example`. `NEXT_PUBLIC_*` se incorpora al cliente y no debe contener secretos. Configure credenciales privadas solo en el servidor.

## Seguridad y privacidad

El panel presenta datos según la cuenta y los permisos devueltos por el backend. Algunas coordenadas y datos de contacto se ocultan inicialmente en la interfaz; esta medida visual no sustituye autorización ni control de acceso en servidor. Utilice una cuenta de demostración y datos ficticios.

Consulte [sesiones y alertas](docs/operacion/SESIONES-Y-ALARMAS.md), [privacidad visual](docs/operacion/PRIVACIDAD-VISUAL.md) y el [registro de cambios](CHANGELOG.md).

**© 2026 deco31416 · MIT.**

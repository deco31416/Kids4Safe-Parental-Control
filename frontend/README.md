# Kids4Safe Web

<p align="center">
  <img
    src="https://res.cloudinary.com/deco31416/image/upload/v1794083722/cover-deco31416_bga9qj.png"
    alt="DECO31416 — software, inteligencia artificial e ingeniería"
    width="100%"
  />
</p>

Experiencia web de Kids4Safe para flujos QR/link, presentación del producto, alta de cuenta y sesiones autorizadas. La aplicación web trabaja junto al backend y al panel administrativo.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/) [![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Tecnologías

Next.js 16, React 18, TypeScript, Tailwind CSS, Socket.IO, WebRTC y componentes Radix UI.

## Desarrollo

```powershell
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
corepack pnpm run dev
```

La aplicación web usa el puerto 3000. Configure la URL del backend en `.env.local`; las variables `NEXT_PUBLIC_*` son públicas y no deben contener credenciales privadas.

## Experiencia QR/link

El flujo permite iniciar sesiones mediante enlace o código QR, presentar solicitudes de permisos y comunicar el estado de la sesión. El navegador y el sistema operativo controlan el acceso a cámara, micrófono y ubicación. El acceso a medios requiere una acción y permisos compatibles con el dispositivo.

Consulte [documentación del módulo](docs/README.md) y [cambios](CHANGELOG.md).

**© 2026 deco31416 · MIT.**

# Kids4Safe Backend

<p align="center">
  <img
    src="https://res.cloudinary.com/deco31416/image/upload/v1794083722/cover-deco31416_bga9qj.png"
    alt="DECO31416 — software, inteligencia artificial e ingeniería"
    width="100%"
  />
</p>

API central de Kids4Safe. Gestiona autenticación, cuentas y perfiles, sesiones de Auxilio, políticas de permisos, notificaciones, ubicación, auditoría y almacenamiento de medios. También coordina las aplicaciones web/móvil y los servicios internos.

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/) [![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://www.mongodb.com/) [![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socketdotio)](https://socket.io/) [![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Capacidades

- Autenticación JWT y autorización basada en roles/permisos.
- Sesiones móviles y QR/link con políticas configurables y permisos con vencimiento.
- Señalización Socket.IO para coordinación WebRTC.
- Ubicación, historial, geocercas y clasificación contextual de IP.
- Notificaciones web y móviles.
- Registros de auditoría, reportes PDF y gestión de medios.
- Integración opcional con microservicios FastAPI.

## Arquitectura

```mermaid
flowchart LR
  C[App móvil / Frontend / Panel] -->|REST HTTPS| API[NestJS API]
  C <-->|Socket.IO| API
  API --> DB[(MongoDB)]
  API --> R[(Redis)]
  API --> V[(Volumen de medios)]
  API --> MS[Servicios FastAPI]
  API --> P[Push notifications]
  C <-->|WebRTC media| C
```

## Requisitos

Node.js admitido por `package.json`, Yarn 4 mediante Corepack, MongoDB y Redis. El puerto local predeterminado es 7000.

## Instalación y ejecución

```powershell
corepack yarn install --immutable
Copy-Item .env.example .env.local
corepack yarn start:dev
```

Configure MongoDB, Redis, JWT, credencial interna de servicio, orígenes permitidos y almacenamiento multimedia en el entorno de ejecución. El archivo `.env.example` lista las variables disponibles; utilice valores distintos por entorno y no los publique. En producción, configure un volumen persistente para los medios.

## API y autenticación

La especificación OpenAPI y Swagger están disponibles en `/api/docs` cuando se ejecuta el backend. Las rutas administrativas usan JWT y permisos; las integraciones internas requieren su credencial de servicio. Las solicitudes de medios/ubicación dependen además de los permisos otorgados por la persona usuaria y la política de sesión.

## Datos y demostración

MongoDB almacena información persistente; Redis mantiene estado temporal y coordinación. El backend puede manejar perfiles, información de dispositivos, ubicación, notificaciones y medios. Para la edición de demostración, use cuentas y datos ficticios, limite el acceso al panel y elimine los registros de demostración al terminar.

## Documentación

Consulte [guías del backend](docs/README.md), [OpenAPI global](../global-docs/api/backend-openapi.yaml) y [arquitectura de microservicios](../global-docs/arquitectura/microservicios.md).

**© 2026 deco31416 · MIT.**

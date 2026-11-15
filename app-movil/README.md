# Kids4Safe Mobile

<p align="center">
  <img
    src="https://res.cloudinary.com/deco31416/image/upload/v1794083722/cover-deco31416_bga9qj.png"
    alt="DECO31416 — software, inteligencia artificial e ingeniería"
    width="100%"
  />
</p>

**Kids4Safe Mobile** es la aplicación de asistencia y protección familiar. Reúne perfil de emergencia, estado del dispositivo, permisos, notificaciones, localización y activación de Auxilio. La activación se inicia manteniendo pulsado el botón durante tres segundos.

[![Expo](https://img.shields.io/badge/Expo-56-000020?logo=expo)](https://expo.dev/) [![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react)](https://reactnative.dev/) [![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Funciones

- Perfil e información útil para una situación de emergencia.
- Activación de Auxilio con estado visible y opción de cierre.
- Configuración de permisos y preparación del dispositivo.
- Notificaciones, ubicación y sensores cuando están habilitados y autorizados.
- Conexión con backend para sincronizar sesiones y estado.

## Tecnologías

Expo 56, React Native 0.85, React 19, Expo Router, TypeScript 6, Zustand, Axios, Expo SecureStore, Expo Location, Expo Notifications y WebRTC.

## Desarrollo local

Requisitos: Node.js compatible con `package.json` y Corepack/pnpm 10.12.1.

```powershell
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
corepack pnpm run web --port 8081
```

Configure `EXPO_PUBLIC_API_URL` en `.env.local` para desarrollo. En EAS, defina esa variable por entorno antes de generar el build; ya no se guarda el endpoint en `eas.json`. Para Android Emulator use `10.0.2.2`; en un teléfono físico, indique una dirección LAN accesible. Los builds Android/iOS requieren archivos de cliente Firebase configurados localmente o como variables File en EAS. Consulte [Firebase y notificaciones nativas](firebase/README.md).

## Builds

```powershell
corepack pnpm run build:preview:android
corepack pnpm run build:production:android
corepack pnpm run build:production:ios
corepack pnpm run verify:push-config
```

Los identificadores nativos existentes (`com.bloomprotect.mobile`, scheme `bloomprotect` y slug `bloomprotect-mobile`) forman parte de la configuración de Expo y las instalaciones existentes. Una migración requiere actualizar Expo, Firebase, enlaces y distribución de aplicaciones.

## Privacidad

La app solicita permisos del sistema para las funciones que los necesitan. Use cuentas y datos ficticios en la demostración; no incorpore credenciales a variables `EXPO_PUBLIC_*`. Los tokens de sesión se gestionan mediante los mecanismos de almacenamiento de la app.

Consulta [configuración local](docs/operacion/CONFIGURACION-LOCAL.md), [permisos y pantallas](docs/producto/IDENTIDAD-Y-PANTALLAS.md), [calidad](docs/calidad/PRUEBAS-Y-LIMITES.md) y [cambios](CHANGELOG.md).

**© 2026 deco31416 · MIT.**


# Changelog

Todos los cambios importantes de **Kids4Safe Mobile** se documentaran en este archivo.

El formato sigue una version simplificada de [Keep a Changelog](https://keepachangelog.com/) y versionado semantico.

## [Unreleased] - 2026-10-15

- Corregido el patrón de instalación de Railway a `vendor/**` para incluir el código de la dependencia local de imágenes antes de `pnpm install`; conservadas las versiones y la lógica de la app.
- Aplicada la identidad Kids4Safe, logo y favicon compartidos, paleta oficial y rediseño de Inicio, Perfil, Seguridad y modales.
- Unificados tamaño del logo y encabezados de 84 puntos; alineado el botón de localizador y fijado el radio de la tarjeta de ayuda en 40 puntos.
- Conservado el desplazamiento con indicadores ocultos; mejorados campos, textos comerciales y avisos en dos líneas.
- Añadidos avatares predeterminados para perfiles nuevos y conservada la prioridad de fotos personales.
- Corregidas las regresiones aprobadas de recuperación sin red, preferencias, compensación del inicio, cierre pendiente, diagnóstico y autenticación.
- Añadidas 24 pruebas de regresión; las tareas sin aprobar se trasladan a docs/seguimiento/TAREAS-Y-PENDIENTES-POR-HACER.md.
- Actualizados README, documentación por carpetas y .gitignore sin cambiar los identificadores nativos heredados.

## [1.0.4] - 2026-08-20

### Estabilidad Android y Node.js 24

- Alineada la resolución nativa de Expo/Metro para instalaciones reproducibles con pnpm y Node.js 24.19.0.
- Actualizado `react-native-screens` al rango compatible con Expo 56 y habilitada la resolución de autolinking.
- Controlados los fallos del GPS pasivo sin interrumpir el arranque de la aplicación.
- Detenidos sensores, GPS y temporizadores cuando el backend informa que la sesión móvil ya no existe.
- Evitadas promesas Axios rechazadas después de finalizar o reemplazar una emergencia.
- Validado TypeScript, compatibilidad Expo y las 16 pruebas de metadata de imágenes.

## [1.0.3] - 2026-08-20

### Audio multiplataforma

- Separada la captura de audio nativa y web sin cambiar los clips de 8 segundos ni su intervalo de 12 segundos.
- Web usa `MediaRecorder` y procesa directamente el `Blob`; Android/iOS conservan `expo-audio` y archivos temporales locales.
- Normalizado `audio/webm;codecs=opus` a `audio/webm` antes de subirlo para cumplir el contrato multimedia del backend.
- Canceladas las subidas tardías cuando una emergencia termina y liberados micrófono, temporizadores y archivos temporales.
- Validado TypeScript y resolución del bundle web con Node.js 24.19.0 sin dependencias nuevas.

### Push nativo y consentimiento

- Preparada la configuración Firebase Android/iOS mediante archivos locales ignorados o variables File de EAS.
- Configurado el build de producción para fallar si faltan los archivos cliente Firebase.
- Añadidos registro, rotación y eliminación del token push asociados al ciclo de autenticación.
- Las solicitudes remotas de cámara, micrófono, pantalla o ubicación exigen ID, consentimiento explícito y vencimiento vigente.
- Añadido diagnóstico de backend, unidad, push y permisos sin exponer tokens.
- Conservado inicio por pulsación de 3 segundos y añadida confirmación separada para detener un auxilio.

### Seguridad WebRTC

- Cambiada la cache ICE global por una cache por sesion con expiracion basada en el TTL del backend.
- Conservado el envio del token de sesion movil al endpoint WebRTC protegido.
- Migrada la configuracion real de `.env` a `.env.local` con fallback STUN sin credenciales.
- Validado TypeScript y export web limpia con Node.js 24.19.0 sin actualizar dependencias.
- Verificado que el bundle movil no contiene la URL TURN estatica ni credenciales literales.

---

## [1.0.2] - 2026-06-12

### Configuracion

- Alineado `.env.railway.example` con el backend Railway actual.
- Conservado fallback ICE para WebRTC desde la configuracion Expo.
- Endurecido `.gitignore` para secretos, certificados, caches nativas, logs y artefactos temporales.
- Version de paquete y metadata Expo actualizadas a `1.0.2`.

---

## [1.0.1] - 2026-06-10

### Mantenimiento

- Actualizado `README.md` con version actual y fecha de mantenimiento.
- Actualizado `.gitignore` para caches de despliegue, Railway examples y herramientas JS.
- Version de paquete actualizada a `1.0.1`.

### Contexto operativo

- La app movil se mantiene como flujo directo independiente del flujo web de enlaces.
- La version web Expo sigue disponible para pruebas en navegador; Android/iOS requieren build nativo para permisos continuos y capacidades nativas completas.
- Branding actualizado a Kids4Safe en metadata Expo, colores base y experiencia visible.

---

## [1.0.0] - 2026-05-28

### Agregado

- Base movil con Expo, React Native, TypeScript y Expo Router.
- Configuracion EAS Build para `development`, `preview` y `production`.
- Identificadores nativos:
  - iOS: `com.Kids4Safe.Kids4Safe`
  - Android: `com.Kids4Safe.Kids4Safe`
- Cliente API centralizado con Axios.
- Lectura de backend mediante `EXPO_PUBLIC_API_URL`.
- Store de autenticacion con Zustand.
- Persistencia de token con secure storage compatible con web.
- Pantallas principales:
  - Home
  - Login
  - Register
  - History
  - Profile
  - Security
- Home de auxilio con boton de mantener presionado durante 3 segundos.
- Activacion de auxilio conectada a servicio de emergencia.
- API de emergencia preparada para consentimiento, informacion de dispositivo y ubicacion.
- Pantalla de permisos con toggles interactivos.
- Hook `useSecurityPermissions` para permisos de ubicacion, camara, microfono y notificaciones.
- Modal informativo de permisos.
- Perfil editable con avatar, telefono, contacto de emergencia y grupo sanguineo.
- Selector de grupo sanguineo.
- Toast global reutilizable con `ToastProvider` y `useToast`.
- Fuente Plus Jakarta Sans.
- Tema visual claro tipo Kids4Safe.
- Componentizacion por dominios:
  - `home`
  - `profile`
  - `security`
  - `layout`
  - `ui`
  - `qr`
  - `auth`

### Cambiado

- El flujo visual principal paso a una experiencia de seguridad movil Kids4Safe.
- Se reemplazaron alertas nativas por toast componetizado en pantallas principales.
- Se separo `HomeHero` en componentes mas pequenos.
- Se movio la logica de hold-to-activate al hook `useHoldToActivate`.
- Se corrigio copy de notificaciones a `Notificaciones PUSH`.

### Preparado

- Bluetooth cercano para futura integracion con accesorios de seguridad.
- Transmision de pantalla para futura implementacion en build nativo.
- Conexion completa con backend real de emergencia.
- Builds Android e iOS con EAS.

### Notas

- Bluetooth avanzado y transmision de pantalla requieren validacion adicional fuera de Expo Go.
- La prueba completa de permisos debe realizarse en dispositivo Android/iOS real.

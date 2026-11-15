# Firebase y notificaciones nativas

Los builds nativos de Kids4Safe Mobile usan la configuración cliente de Firebase:

- Android: `google-services.json`.
- iOS: `GoogleService-Info.plist`.

Estos archivos de configuración identifican el proyecto Firebase de la app. Se excluyen de Git; las claves privadas de cuentas de servicio/FCM nunca deben incluirse en la aplicación cliente ni en este directorio.

## Configuración

En desarrollo local, coloque los archivos bajo `firebase/` o configure las rutas por entorno:

- `GOOGLE_SERVICES_JSON`
- `GOOGLE_SERVICES_PLIST`

En EAS, almacene los archivos como variables de tipo **File** y configure las variables anteriores con la ruta que proporciona EAS. Para un build nativo de liberación, active `REQUIRE_NATIVE_PUSH_CONFIG=true`.

La compilación valida la presencia y correspondencia de la configuración:

```powershell
corepack pnpm run verify:push-config
```

Android también puede utilizar `android/app/google-services.json` en un entorno local. Los identificadores de bundle/package deben coincidir con la app registrada en Firebase.

**© 2026 deco31416 · MIT.**

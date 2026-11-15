# Web Push para frontend/link

## Objetivo

Permitir que el backend envie notificaciones al usuario del link/QR incluso cuando la pestaña ya no este abierta.

El sistema usa:

- Frontend: `public/sw.js` como Service Worker.
- Frontend: `src/lib/web-push.ts` para crear `PushSubscription`.
- Backend: `src/notification/web-push/*` para guardar suscripciones y enviar Web Push.
- Backend: libreria open source `web-push`.

## Variables de entorno

En backend local y Railway:

```env
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_VAPID_SUBJECT=mailto:admin@qr-kraken.com
```

Generar claves:

```powershell
cd C:\Users\HP\Desktop\QR-Deco\backend
yarn web-push generate-vapid-keys
```

La clave publica se entrega al navegador desde:

```txt
GET /notifications/web-push/public-key
```

La clave privada nunca debe ir en frontend ni admin.

## Flujo

1. El usuario abre el link/QR.
2. El frontend solicita permiso de notificaciones.
3. El frontend registra `/sw.js`.
4. El navegador crea una `PushSubscription`.
5. El frontend guarda la suscripcion:

```txt
POST /notifications/web-push/subscriptions
Header: X-Publisher-Session-Token
```

6. Cuando el admin envia una notificacion, el backend intenta:

- Socket.IO si la pestaña esta abierta.
- Expo Push si es app movil instalada.
- Web Push si existe `PushSubscription` web.

## Limitaciones reales

- Requiere HTTPS en produccion. `localhost` funciona para desarrollo.
- Si el usuario deniega notificaciones, no hay Web Push.
- Compartir pantalla no se puede activar en background. La notificacion puede abrir la sesion, pero `getDisplayMedia` exige gesto explicito del usuario.
- En iOS/Safari, Web Push web depende de las reglas de Apple para web apps instaladas.

## Siguiente fase

Cuando el volumen crezca, mover `backend/src/notification/web-push` a un microservicio dedicado `microservicio-web-push`.

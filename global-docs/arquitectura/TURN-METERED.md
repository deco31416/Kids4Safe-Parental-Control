# TURN Metered para WebRTC

## Objetivo

Usar Metered como relay TURN para que WebRTC siga conectando cuando STUN/P2P no sea suficiente, especialmente entre redes moviles, NAT estricto, Wi-Fi corporativo o regiones distintas.

## Fuente de credenciales

Las credenciales salen del Dashboard de Metered:

- TURN Server: muestra `username`, `password` y el arreglo `iceServers`.
- Developers: muestra el `secretKey` usado solo por backend.
- Credential API key: se muestra junto a la credencial TURN y sirve para obtener ICE servers de esa credencial.

Documentacion oficial:

- TURN REST API: https://www.metered.ca/docs/turn-rest-api/
- Get TURN Usage: https://www.metered.ca/docs/turn-rest-api/get-current-usage/
- Creating TURN Credentials: https://www.metered.ca/docs/turn-server-service/creating-turn-credentials/

## Variables por servicio

Backend, secretos, metrica y entrega de ICE servers:

```env
METERED_TURN_APP_NAME=your-metered-app-name
METERED_TURN_SECRET_KEY=your-metered-secret-key
METERED_TURN_CREDENTIAL_API_KEY=<metered-turn-credential-api-key>
METERED_TURN_USERNAME=your-turn-credential-username
METERED_TURN_PASSWORD=your-turn-credential-password
METERED_TURN_REGION=South America
METERED_TURN_PLAN_NAME=Free Trial Global
METERED_TURN_QUOTA_GB=0.5
METERED_TURN_PERIOD_END=2026-07-08
WEBRTC_ICE_SERVERS_JSON=
```

El backend expone:

```text
GET /webrtc/ice-servers
```

Frontend, Admin Panel y App Movil deben consumir ese endpoint. Las variables publicas quedan solo como fallback local o contingencia:

```env
NEXT_PUBLIC_ICE_SERVERS_JSON=
EXPO_PUBLIC_ICE_SERVERS_JSON=
```

No poner credenciales reales TURN en variables publicas si el backend esta disponible.

## Metrica en Admin

El backend consulta:

```text
GET https://<appname>.metered.live/api/v1/turn/current_usage?secretKey=<secretKey>
```

La respuesta esperada incluye:

- `quotaInGB`
- `usageInGB`
- `overageInGB`

El admin panel consume `GET /admin/turn/usage` y muestra plan, region, cuota, uso, restante, overage, fecha de corte y fuente de datos.

Si Metered no responde o falta el `secretKey`, el backend usa fallback por env con cuota `METERED_TURN_QUOTA_GB` y uso `0`, para que el panel siga mostrando configuracion base.

## Seguridad

- `METERED_TURN_SECRET_KEY` nunca va en frontend, admin panel ni app movil.
- `METERED_TURN_CREDENTIAL_API_KEY` y `METERED_TURN_PASSWORD` tambien son variables solo de backend.
- Las credenciales TURN que entregue `/webrtc/ice-servers` son visibles al cliente WebRTC por naturaleza del protocolo, pero ya no quedan persistidas en bundles publicos ni en Railway de frontend/app.
- Si se filtran credenciales TURN, se rotan en Metered y se actualizan las variables de Railway.

## Limite actual

Plan actual: Free Trial Global, 500 MB mensuales. Si se llega al limite mensual, Metered detiene el TURN hasta renovar o subir de plan.

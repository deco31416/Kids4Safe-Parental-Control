# Prueba local Kids4Safe

Actualizado: 2026-10-15.

## Runtime

- Node.js recomendado: `24.19.0`.
- También se admite Node `22.13.0` o superior dentro de la línea 22.
- Backend: Yarn 4 mediante Corepack.
- Interfaces: PNPM 10 mediante Corepack.
- Microservicios: entorno `.venv` independiente.

## Validación sin iniciar servicios

```powershell
.\scripts\test-local-ready.ps1
.\scripts\test-all.ps1
.\scripts\audit-all.ps1
```

`test-local-ready.ps1` revisa runtime, variables, dependencias locales, archivos y puertos.
`test-all.ps1` añade builds, TypeScript, lint y las pruebas de los ocho microservicios.
`audit-all.ps1` consulta los avisos de Yarn, pnpm y Python sin cambiar dependencias.
Necesita conexión a Internet y puede tardar varios minutos.

## Iniciar la plataforma

```powershell
.\scripts\start-all.ps1
```

Los procesos abren terminales visibles por defecto y se registran en `scripts/.runtime`.
Para ejecutar el stack en segundo plano sin mostrar las terminales:

```powershell
.\scripts\start-all.ps1 -Hidden
```

Servicios esperados:

- Frontend: `http://localhost:3000`
- Admin Panel: `http://localhost:3002`
- App móvil web: `http://localhost:8081`
- Backend/Swagger: `http://localhost:7000` y `http://localhost:7000/api/docs`
- Microservicios: puertos `5001`, `5002`, `5003`, `5005`, `5006`, `5007`, `5008` y `5009`.

## Detener

```powershell
.\scripts\stop-all.ps1
```

El script valida PID y hora de inicio, cierra su árbol nativo, reutiliza una sola captura de listeners como respaldo y comprueba que los puertos queden libres. No depende de CIM/WMI.

## Contrato de entorno

- Cada proyecto usa exclusivamente `.env.local` para desarrollo.
- Los `.env.local` no se guardan en Git.
- El arranque toma `ADMIN_API_KEY`, `MONGODB_URI` y `REDIS_URL` del backend y los hereda en memoria hacia los microservicios.
- Si local comparte MongoDB con otro entorno, `BCRYPT_PEPPER` debe ser exactamente el mismo que se usó para generar los hashes; nunca se documenta su valor.
- `ADMIN_API_KEY` debe coincidir entre backend, panel y microservicios; el preflight rechaza diferencias.
- Se rechazan credenciales TURN dentro de variables `NEXT_PUBLIC_*` o `EXPO_PUBLIC_*`.
- `RUN_SEEDS`, `ALLOW_USER_RESET` y `ALLOW_USER_FIX` permanecen desactivados normalmente.
- Las credenciales administrativas locales deben corresponder a un usuario existente en MongoDB; el arranque nunca resetea contraseñas automáticamente.

## Comprobaciones adicionales vigentes

- App móvil: `node --test test/*.test.cjs vendor/metro-image-metadata/index.test.js`.
- Admin panel: `node --test test/*.test.cjs`.
- Backend: `yarn test`, que incluye avatares predeterminados y almacenamiento.
- El seguimiento de tareas de la app está en `app-movil/docs/seguimiento/TAREAS-Y-PENDIENTES-POR-HACER.md`.
- La MongoDB de desarrollo es local; las apps consumen la API, no se conectan directamente a la base. Redis conserva su configuración independiente.

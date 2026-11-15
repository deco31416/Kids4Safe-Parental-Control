# Guia De Contribucion

Gracias por contribuir a **Kids4Safe Mobile**. Esta aplicacion pertenece a **Kids4Safe** y maneja flujos sensibles de seguridad movil, por lo que cada cambio debe cuidar estabilidad, privacidad y experiencia de usuario.

## Principios

- Usar `pnpm` para todo.
- Mantener TypeScript estricto.
- No hardcodear URLs de backend.
- No mover logica API a componentes visuales.
- No crear capturas ocultas ni flujos sin consentimiento.
- Priorizar componentes pequenos, reutilizables y claros.
- Mantener compatibilidad con Expo y EAS Build.
- Probar en web para UI y en dispositivo real para permisos nativos.

## Flujo Recomendado

1. Crear una rama descriptiva.

```bash
git checkout -b feature/nombre-del-cambio
```

2. Instalar dependencias.

```bash
pnpm install
```

3. Ejecutar TypeScript.

```bash
pnpm typecheck
```

4. Probar en web.

```bash
pnpm expo start --web
```

5. Probar en celular cuando el cambio toque permisos, camara, ubicacion, microfono, notificaciones o scanner.

```bash
pnpm start
```

## Estructura De Codigo

Las pantallas en `app/` deben componer componentes. Evitar pantallas gigantes.

Preferir:

```text
app/security.tsx
src/components/security/*
src/hooks/useSecurityPermissions.ts
```

Evitar:

```text
app/security.tsx con toda la UI, API y permisos mezclados
```

## Componentes

- UI generica: `src/components/ui`
- Layout: `src/components/layout`
- Home: `src/components/home`
- Seguridad: `src/components/security`
- Perfil: `src/components/profile`
- Auth: `src/components/auth`
- QR: `src/components/qr`

Cada carpeta debe exportar componentes desde su `index.ts` cuando aplique.

## Hooks Y Servicios

Usar hooks para comportamiento reutilizable:

- Permisos.
- Animaciones de interaccion.
- Estado local complejo.

Usar services para flujos de negocio:

- Activacion de emergencia.
- Envio de datos al backend.
- Orquestacion de APIs.

## API

Toda llamada HTTP debe vivir en `src/api` o en servicios que consuman `src/api`.

La URL base se obtiene solo desde:

```bash
EXPO_PUBLIC_API_URL
```

No se aceptan URLs hardcodeadas en pantallas.

## Seguridad Y Permisos

Los cambios relacionados con permisos deben cumplir:

- Explicar al usuario por que se solicita el permiso.
- Mostrar estado visible de activacion.
- Permitir desactivar la funcion dentro de la app cuando aplique.
- Documentar limitaciones de Expo Go si existen.
- No implementar captura secreta o silenciosa.

## Estilo Visual

La app debe mantener una estetica movil premium:

- Interfaz limpia.
- Espaciado consistente.
- Tipografia Plus Jakarta Sans.
- Cards suaves.
- Acciones claras.
- Estados visibles.
- Mobile first.

Usar tokens de `src/theme` antes de crear colores sueltos.

## Commits

Formato recomendado:

```text
tipo: descripcion corta
```

Ejemplos:

```text
feat: agregar permisos interactivos en security
fix: corregir focus visual en inputs de perfil
docs: documentar builds con eas
refactor: separar boton auxilio en componente
```

Tipos sugeridos:

- `feat`
- `fix`
- `docs`
- `refactor`
- `style`
- `test`
- `chore`

## Pull Requests

Cada PR debe incluir:

- Resumen del cambio.
- Pantallas afectadas.
- Comandos ejecutados.
- Resultado de `pnpm typecheck`.
- Evidencia visual si modifica UI.
- Notas de pruebas en dispositivo si toca permisos nativos.

## Checklist Antes De Entregar

- [ ] `pnpm install` pasa.
- [ ] `pnpm typecheck` pasa.
- [ ] No hay imports rotos.
- [ ] No hay URLs hardcodeadas.
- [ ] No hay `any` innecesario.
- [ ] No hay componentes gigantes nuevos.
- [ ] La navegacion funciona.
- [ ] La UI responde en anchos pequenos.
- [ ] Los permisos sensibles se prueban en dispositivo real cuando aplica.

## Builds

Preview Android:

```bash
pnpm build:preview:android
```

Produccion Android:

```bash
pnpm build:production:android
```

Produccion iOS:

```bash
pnpm build:production:ios
```

## Reporte De Bugs

Incluir:

- Plataforma: web, Android o iOS.
- Version de la app.
- Pasos para reproducir.
- Resultado esperado.
- Resultado actual.
- Captura o error de consola si existe.
- Dispositivo y version del sistema operativo.

## Licencia

Al contribuir, aceptas que tus aportes queden bajo la licencia del proyecto.

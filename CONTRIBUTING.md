# Contribuir a Kids4Safe

Gracias por tu interés en contribuir a Kids4Safe, una plataforma de asistencia y protección familiar. Esta guía aplica a las aplicaciones, el backend, los microservicios y la documentación del producto.

## Antes de empezar

1. Identifica el componente que vas a modificar y revisa su `README.md`, `CONTRIBUTING.md` y guías asociadas.
2. Mantén el cambio acotado al componente afectado y conserva sus herramientas y convenciones.
3. No incluyas secretos, credenciales de demostración reales, datos personales, capturas de pantalla privadas ni archivos de configuración locales.
4. No añadas funciones de captura o seguimiento que oculten su actividad o eludan los permisos del dispositivo.

## Dependencias y configuración

- Web y panel: usa Node.js/Corepack y el gestor indicado por el `package.json` y lockfile del componente.
- App móvil: utiliza Expo/EAS y configura Firebase mediante archivos locales ignorados o variables de tipo File.
- Backend: utiliza Yarn/Corepack, MongoDB y Redis configurados para el entorno de desarrollo.
- Microservicios: instala dependencias en un entorno virtual Python por servicio. `requirements.txt` contiene dependencias de ejecución; `requirements-dev.txt` las hereda y añade herramientas de desarrollo/verificación.
- Almacena `ADMIN_API_KEY`, secretos JWT, claves de Metered/TURN y credenciales de base de datos solo en gestores de secretos o variables privadas.

## Calidad del cambio

Antes de enviar una contribución:

- Ejecuta las comprobaciones documentadas por el componente modificado.
- Mantén sincronizados los contratos API y clientes cuando un cambio altere interfaces.
- Actualiza documentación y changelog del componente si cambia el comportamiento observable.
- Describe el propósito, el alcance, la configuración requerida y la evidencia de verificación.

## Revisión

Las contribuciones deben explicar el comportamiento esperado y los riesgos de compatibilidad. Los cambios de autenticación, permisos, ubicación, medios, retención o almacenamiento requieren atención especial a autorización, minimización y borrado de datos.

Para una distribución pública, confirma que el autor tiene derecho a contribuir el código y que los avisos/licencias de dependencias y recursos de terceros permanecen intactos.

## Licencia

Las contribuciones aceptadas se distribuyen bajo los términos MIT indicados en [LICENSE](LICENSE), salvo que se acuerde por escrito otra condición.

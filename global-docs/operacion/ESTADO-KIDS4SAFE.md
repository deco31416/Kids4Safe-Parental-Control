# Estado documentado de Kids4Safe

Fecha: 2026-10-15.

## Configuración

- Marca visible: Kids4Safe, con paleta azul marino, azul y turquesa.
- Desarrollo: MongoDB localhost del backend; las interfaces consumen la API.
- Redis: dependencia independiente para estado temporal, configurada fuera de Git.
- Fotos y medios: filesystem del backend en local; volumen persistente configurado para Railway.
- Cuentas de prueba: privadas, sin contraseñas en repositorios ni documentación.

## Trabajo reciente

- Rediseño móvil de Inicio, Perfil, Seguridad, campos, permisos y modales.
- Logos de tamaño uniforme y encabezados de 84 puntos para evitar saltos al navegar.
- Dos ilustraciones predeterminadas para perfiles nuevos, con elección persistida.
- Regresiones de Auxilio y autenticación corregidas dentro del alcance aprobado.
- Panel: peticiones administrativas, gestión de sesiones y limpieza de alarma cubiertas por pruebas.
- Repositorios: guías por carpetas, changelog y exclusiones de datos privados revisadas.

## Límites

Los resultados automatizados usan simulaciones y almacenamiento temporal donde corresponde. No sustituyen pruebas físicas Android/iOS, compatibilidad de localizadores, entrega de correo, revisión de secretos EAS ni comprobación del volumen remoto. La guía de AirTag no integra coordenadas con Kids4Safe.

La lista detallada de tareas sin aprobar está en [el seguimiento de la app](https://github.com/Kids4Safe/app-movil/blob/main/docs/seguimiento/TAREAS-Y-PENDIENTES-POR-HACER.md). Publicar este documento no autoriza implementarlas.

Esta actualización no ejecuta los scripts de inicio, no migra bases y no verifica un despliegue Railway. Si existe despliegue automático conectado a GitHub, su estado debe consultarse por separado.

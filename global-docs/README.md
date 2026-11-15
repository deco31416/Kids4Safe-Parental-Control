# Documentación de Kids4Safe

<p align="center">
  <img
    src="https://res.cloudinary.com/deco31416/image/upload/v1794083722/cover-deco31416_bga9qj.png"
    alt="DECO31416 — software, inteligencia artificial e ingeniería"
    width="100%"
  />
</p>

Guías de arquitectura, operación, APIs, seguridad y comunicación en tiempo real de Kids4Safe. Esta documentación acompaña la edición demostrativa del producto y describe los componentes de la plataforma.

## Índice

### Arquitectura

- [Arquitectura general](arquitectura/arquitectura.md)
- [Microservicios y dependencias](arquitectura/microservicios.md)
- [Diagramas de secuencia](arquitectura/SEQUENCE-DIAGRAM.md)
- [Integración TURN](arquitectura/TURN-METERED.md)

### APIs y tiempo real

- [API WebSocket](api/WEBSOCKET-API.md)
- [Autenticación WebSocket](seguridad/WEBSOCKET-AUTH.md)
- [Implementación WebRTC](tiempo-real/WEBRTC-IMPLEMENTATION.md)
- [Configuración WebRTC](tiempo-real/WEBRTC-SETUP.md)
- [Notificaciones Web Push](tiempo-real/WEB-PUSH.md)

### Operación

- [Pruebas del stack local](operacion/PRUEBAS-LOCALES.md)
- [Health checks](operacion/HEALTH-CHECK.md)
- [Ciclo de vida de sesiones QR](operacion/QR-SESSION-LIFECYCLE.md)
- [Estado funcional de los componentes](operacion/ESTADO-KIDS4SAFE.md) — fotografía documental; confirmar comandos y configuración con los README de cada módulo.

### Seguridad

- [Autenticación y roles](seguridad/SECURITY-AUTH.md)

## Componentes de la plataforma

| Componente | Responsabilidad | Puerto local |
| --- | --- | ---: |
| App móvil | Auxilio, perfil, permisos y ubicación | 8081 |
| Frontend | Flujos web QR/link | 3000 |
| Panel de administración | Sesiones, personas, dispositivos y alertas | 3002 |
| Backend | API, autenticación, políticas y datos | 7000 |
| Device Info | Contexto de dispositivo | 5001 |
| Location | Ubicación y geocercas | 5002 |
| Screen Recorder | Capturas autorizadas | 5003 |
| Session Orchestrator | Estado de sesiones | 5005 |
| Audit Log | Eventos de auditoría | 5006 |
| Policy Engine | Evaluación de políticas | 5007 |
| Location Track | Historial de ubicación | 5008 |
| IP Classifier | Clasificación de IP/dispositivo | 5009 |

## Uso y privacidad

La plataforma puede procesar ubicación, perfiles, identificadores de dispositivo, notificaciones y medios. Las funciones dependen de la configuración del entorno y de los permisos concedidos por la persona usuaria. En demostraciones, utilice datos ficticios. Antes de un despliegue real, establezca transparencia, base legal, control de acceso, retención y eliminación conforme a la normativa aplicable.

Las guías técnicas no constituyen asesoría jurídica, certificación ISO ni garantía de seguridad o disponibilidad. Esta edición no incluye los informes internos históricos de auditoría.

## Fuente de verdad

Para instalación, comandos y variables, consulte el README del módulo correspondiente y sus plantillas `.env.example`. Los valores de producción se configuran en el entorno de despliegue; no se deben copiar credenciales ni endpoints privados a esta documentación.

**© 2026 deco31416 · MIT.**


# Kids4Safe — Screen Recorder

<p align="center">
  <img
    src="https://res.cloudinary.com/deco31416/image/upload/v1794083722/cover-deco31416_bga9qj.png"
    alt="DECO31416 — software, inteligencia artificial e ingeniería"
    width="100%"
  />
</p>

**Valida y conserva capturas JPEG en almacenamiento persistente para sesiones autorizadas.**

[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688?logo=fastapi)](https://fastapi.tiangolo.com/) [![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

| Propiedad | Valor |
| --- | --- |
| Versión | 1.1.0 |
| Puerto local | 5003 |
| Runtime | Python 3.11 · FastAPI |
| Dependencia | Filesystem/volumen |

## Integración

Servicio interno consumido por el backend de Kids4Safe. Las rutas de negocio se protegen con X-API-Key; mantenga el mismo secreto de servicio en backend y servicio. En producción requiere volumen persistente para conservar capturas.

## Configuración y ejecución

Configure las variables requeridas indicadas en `.env.example`. Mantenga las claves privadas en el entorno de ejecución.

`powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
`

El puerto puede configurarse mediante las variables de entorno del servicio. Los datos manejados por el servicio pueden incluir información de sesiones, dispositivos o ubicación; utilice datos ficticios en las demostraciones.

**© 2026 deco31416 · MIT.**

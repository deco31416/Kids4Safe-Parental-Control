# Kids4Safe — Device Info

<p align="center">
  <img
    src="https://res.cloudinary.com/deco31416/image/upload/v1794083722/cover-deco31416_bga9qj.png"
    alt="DECO31416 — software, inteligencia artificial e ingeniería"
    width="100%"
  />
</p>

**Normaliza contexto del dispositivo, navegador, sistema operativo y capacidades reportadas por los clientes.**

[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688?logo=fastapi)](https://fastapi.tiangolo.com/) [![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

| Propiedad | Valor |
| --- | --- |
| Versión | 0.1.3 |
| Puerto local | 5001 |
| Runtime | Python 3.11 · FastAPI |
| Dependencia | Redis |

## Integración

Servicio interno consumido por el backend de Kids4Safe. Las rutas de negocio se protegen con X-API-Key; mantenga el mismo secreto de servicio en backend y servicio. GET /health informa disponibilidad del servicio y Redis.

## Configuración y ejecución

Configure las variables requeridas indicadas en `.env.example`. Mantenga las claves privadas en el entorno de ejecución.

`powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
`

El puerto puede configurarse mediante las variables de entorno del servicio. Los datos manejados por el servicio pueden incluir información de sesiones, dispositivos o ubicación; utilice datos ficticios en las demostraciones.

**© 2026 deco31416 · MIT.**

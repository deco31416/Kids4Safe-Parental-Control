import os

from fastapi import FastAPI

from app_lifecycle import lifespan
from frame_images import decode_frame_data, normalize_frame_image
from frame_models import ScreenFrame
from frame_routes import router as frame_router
from health_routes import health_check, router as health_router
from redis_runtime import create_redis_client
from runtime_config import SERVICE_VERSION, storage_path

app = FastAPI(
    title='Screen Recorder Service',
    description='Captura, normalización y almacenamiento durable de frames.',
    version=SERVICE_VERSION,
    lifespan=lifespan,
    docs_url='/docs',
    redoc_url='/redoc',
)
app.include_router(health_router)
app.include_router(frame_router)


@app.get('/')
async def root():
    return {
        'service': 'Microservicio Screen Recorder',
        'status': 'running',
        'port': int(os.getenv('PORT', 5003)),
    }


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', 5003)))


__all__ = [
    'ScreenFrame',
    'app',
    'create_redis_client',
    'decode_frame_data',
    'health_check',
    'lifespan',
    'normalize_frame_image',
    'storage_path',
]

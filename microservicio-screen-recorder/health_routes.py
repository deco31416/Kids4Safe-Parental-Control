import os
import time
from datetime import datetime

import redis
from fastapi import APIRouter, HTTPException, Request

from runtime_config import SERVICE_NAME, SERVICE_VERSION, storage_path

router = APIRouter()
START_TIME = time.time()


@router.get('/health', tags=['Health'])
def health_check(request: Request):
    client = getattr(request.app.state, 'redis_client', None)
    try:
        redis_healthy = client is not None and bool(client.ping())
    except redis.RedisError:
        redis_healthy = False
    try:
        directory = storage_path()
        storage_healthy = directory.is_dir() and os.access(directory, os.W_OK)
    except RuntimeError:
        storage_healthy = False
    health = {
        'status': 'healthy' if redis_healthy and storage_healthy else 'unhealthy',
        'service': SERVICE_NAME,
        'uptime': time.time() - START_TIME,
        'version': SERVICE_VERSION,
        'timestamp': datetime.now().isoformat(),
        'dependencies': {
            'redis': 'healthy' if redis_healthy else 'unhealthy',
            'storage': 'healthy' if storage_healthy else 'unhealthy',
            'evidenceRecorder': _recorder_health(request),
        },
    }
    if health['status'] != 'healthy':
        raise HTTPException(status_code=503, detail=health)
    return health


def _recorder_health(request: Request):
    manager = getattr(request.app.state, 'recorder_manager', None)
    return manager.health() if manager else {'status': 'starting', 'activeSessions': 0}

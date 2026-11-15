import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from redis_runtime import create_redis_client
from runtime_config import storage_path
from frame_retention import retention_loop
from recordings.recorder_config import RecorderConfig
from recordings.recorder_manager import RecorderManager


@asynccontextmanager
async def lifespan(application: FastAPI):
    redis_client = create_redis_client()
    try:
        redis_client.ping()
        directory: Path = storage_path()
        directory.mkdir(parents=True, exist_ok=True)
        if not directory.is_dir() or not os.access(directory, os.W_OK):
            raise RuntimeError('Storage path is not writable')
        application.state.redis_client = redis_client
        recorder_manager = RecorderManager(RecorderConfig.from_env())
        application.state.recorder_manager = recorder_manager
        retention_task = asyncio.create_task(retention_loop())
        await recorder_manager.start()
        try:
            yield
        finally:
            await recorder_manager.stop()
            retention_task.cancel()
            await asyncio.gather(retention_task, return_exceptions=True)
    finally:
        application.state.redis_client = None
        application.state.recorder_manager = None
        redis_client.close()

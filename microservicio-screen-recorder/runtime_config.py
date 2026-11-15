import os
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image

load_dotenv(dotenv_path='.env.local', override=False)

SERVICE_NAME = 'screen-recorder-service'
SERVICE_VERSION = '1.2.0'
MAX_FRAME_BYTES = int(os.getenv('MAX_FRAME_BYTES', 5 * 1024 * 1024))
MAX_IMAGE_PIXELS = int(os.getenv('MAX_IMAGE_PIXELS', 16_000_000))
FRAME_RETENTION_SECONDS = int(os.getenv('FRAME_RETENTION_SECONDS', 86400))
MAX_FRAME_BASE64_CHARS = ((MAX_FRAME_BYTES + 2) // 3) * 4 + 64
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def storage_path() -> Path:
    railway_mount = os.getenv('RAILWAY_VOLUME_MOUNT_PATH')
    if railway_mount:
        return Path(railway_mount).resolve() / 'screen-recorder'
    configured = os.getenv('STORAGE_PATH')
    if configured:
        return Path(configured).resolve()
    if os.getenv('ENV', 'development') == 'production':
        raise RuntimeError('Railway Volume is not mounted for screen-recorder')
    return (Path.cwd().parent / 'local-storage' / 'screen-recorder').resolve()

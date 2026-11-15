import hashlib
import json
from datetime import datetime

from frame_images import decode_frame_data, normalize_frame_image
from frame_models import ScreenFrame
from frame_paths import frame_path, session_directory
from runtime_config import FRAME_RETENTION_SECONDS


def save_frame(frame: ScreenFrame, redis_client):
    normalized = normalize_frame_image(decode_frame_data(frame.frame_data))
    directory = session_directory(frame.session_id)
    directory.mkdir(parents=True, exist_ok=True)
    filename = f'{frame.frame_type}_{frame.timestamp}.jpg'
    target = frame_path(frame.session_id, filename)
    with target.open('xb') as image_file:
        image_file.write(normalized)
    storage_key = f'{frame.session_id}/{filename}'
    metadata = {
        'bytes': len(normalized),
        'filename': filename,
        'frame_type': frame.frame_type,
        'saved_at': datetime.now().isoformat(),
        'session_id': frame.session_id,
        'sha256': hashlib.sha256(normalized).hexdigest(),
        'storage_key': storage_key,
        'timestamp': frame.timestamp,
    }
    try:
        pipeline = redis_client.pipeline(transaction=True)
        pipeline.setex(
            f'frame:{frame.session_id}:{frame.timestamp}',
            FRAME_RETENTION_SECONDS,
            json.dumps(metadata),
        )
        pipeline.zadd(f'frames:{frame.session_id}', {str(frame.timestamp): frame.timestamp})
        pipeline.expire(f'frames:{frame.session_id}', FRAME_RETENTION_SECONDS)
        pipeline.incr(f'frame_count:{frame.session_id}')
        pipeline.expire(f'frame_count:{frame.session_id}', FRAME_RETENTION_SECONDS)
        pipeline.execute()
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return metadata

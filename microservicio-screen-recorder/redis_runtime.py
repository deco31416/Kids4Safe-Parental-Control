import os

import redis


def create_redis_client():
    redis_url = os.getenv('REDIS_URL')
    if redis_url:
        return redis.from_url(redis_url, decode_responses=False)
    return redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        decode_responses=False,
    )


def remove_frame_metadata(client, session_id: str, timestamp: int):
    pipeline = client.pipeline(transaction=True)
    pipeline.delete(f'frame:{session_id}:{timestamp}')
    pipeline.zrem(f'frames:{session_id}', str(timestamp))
    pipeline.execute()


def remove_session_metadata(client, session_id: str):
    keys = list(client.scan_iter(match=f'frame:{session_id}:*', count=100))
    keys.extend([f'frames:{session_id}', f'frame_count:{session_id}'])
    if keys:
        client.delete(*keys)

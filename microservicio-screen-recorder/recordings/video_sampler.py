import asyncio
import logging
from time import monotonic, time

from aiortc.mediastreams import MediaStreamError

from recordings.media_payloads import encode_jpeg_data_url

logger = logging.getLogger(__name__)


async def sample_video_track(track, frame_type, interval_seconds, max_bytes, emit):
    next_capture = 0.0
    try:
        while True:
            frame = await track.recv()
            now = monotonic()
            if now < next_capture:
                continue
            next_capture = now + interval_seconds
            try:
                image = await asyncio.to_thread(frame.to_image)
                payload = await asyncio.to_thread(encode_jpeg_data_url, image, max_bytes)
                await emit('screen-capture', {
                    'image': payload,
                    'timestamp': int(time() * 1000),
                    'type': frame_type,
                })
            except ValueError as error:
                logger.warning('Frame %s descartado: %s', frame_type, error)
    except MediaStreamError:
        logger.info('Track de video %s finalizado', frame_type)

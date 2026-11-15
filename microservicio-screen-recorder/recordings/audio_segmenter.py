import asyncio
import logging
from time import time

from av.audio.resampler import AudioResampler
from aiortc.mediastreams import MediaStreamError

from recordings.media_payloads import encode_wav_data_url

logger = logging.getLogger(__name__)
SAMPLE_RATE = 16_000


async def segment_audio_track(track, segment_seconds, emit):
    resampler = AudioResampler(format='s16', layout='mono', rate=SAMPLE_RATE)
    chunks: list[bytes] = []
    samples = 0
    target_samples = SAMPLE_RATE * segment_seconds

    async def flush():
        nonlocal chunks, samples
        if not chunks:
            return
        duration = samples / SAMPLE_RATE
        payload = await asyncio.to_thread(encode_wav_data_url, chunks, SAMPLE_RATE)
        chunks, samples = [], 0
        await emit('audio-capture', {
            'audio': payload,
            'duration': round(duration, 3),
            'timestamp': int(time() * 1000),
        })

    try:
        while True:
            frame = await track.recv()
            for converted in resampler.resample(frame):
                byte_count = converted.samples * 2
                chunks.append(bytes(converted.planes[0])[:byte_count])
                samples += converted.samples
                if samples >= target_samples:
                    await flush()
    except MediaStreamError:
        for converted in resampler.resample(None):
            byte_count = converted.samples * 2
            chunks.append(bytes(converted.planes[0])[:byte_count])
            samples += converted.samples
        await flush()
        logger.info('Track de audio finalizado')
    except asyncio.CancelledError:
        await asyncio.shield(flush())
        raise

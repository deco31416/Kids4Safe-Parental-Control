import base64
import io
import wave

from PIL import Image


def encode_jpeg_data_url(image: Image.Image, max_bytes: int) -> str:
    normalized = image.convert('RGB')
    normalized.thumbnail((1280, 1280), Image.Resampling.LANCZOS)

    for quality in (82, 72, 62, 52, 42):
        output = io.BytesIO()
        normalized.save(output, format='JPEG', quality=quality, optimize=True)
        payload = output.getvalue()
        if len(payload) <= max_bytes:
            return _data_url('image/jpeg', payload)

    raise ValueError('Video frame exceeds recorder payload limit')


def encode_wav_data_url(pcm_chunks: list[bytes], sample_rate: int = 16_000) -> str:
    output = io.BytesIO()
    with wave.open(output, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(b''.join(pcm_chunks))
    return _data_url('audio/wav', output.getvalue())


def _data_url(content_type: str, payload: bytes) -> str:
    encoded = base64.b64encode(payload).decode('ascii')
    return f'data:{content_type};base64,{encoded}'

import base64
import binascii
import io

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

from runtime_config import MAX_FRAME_BYTES, MAX_IMAGE_PIXELS


def decode_frame_data(frame_data: str) -> bytes:
    encoded = frame_data
    if frame_data.startswith('data:'):
        prefix, separator, encoded = frame_data.partition(',')
        if not separator or prefix.lower() not in {
            'data:image/jpeg;base64',
            'data:image/png;base64',
            'data:image/webp;base64',
        }:
            raise HTTPException(status_code=422, detail='Unsupported image data URI')
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=422, detail='Invalid base64 image') from None
    if not image_bytes:
        raise HTTPException(status_code=422, detail='Empty image')
    if len(image_bytes) > MAX_FRAME_BYTES:
        raise HTTPException(status_code=413, detail='Image exceeds configured size limit')
    return image_bytes


def normalize_frame_image(image_bytes: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            if source.format not in {'JPEG', 'PNG', 'WEBP'}:
                raise HTTPException(status_code=422, detail='Unsupported image format')
            if getattr(source, 'n_frames', 1) != 1:
                raise HTTPException(status_code=422, detail='Animated images are not supported')
            width, height = source.size
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail='Image dimensions exceed configured limit')
            source.load()
            image = source.convert('RGB')
            image.thumbnail((1280, 720), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            image.save(output, 'JPEG', quality=85, optimize=True)
            return output.getvalue()
    except HTTPException:
        raise
    except Image.DecompressionBombError:
        raise HTTPException(status_code=413, detail='Image dimensions exceed configured limit') from None
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=422, detail='Invalid image content') from None

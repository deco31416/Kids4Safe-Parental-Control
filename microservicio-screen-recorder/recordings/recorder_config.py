import os
from dataclasses import dataclass


def _enabled(value: str | None) -> bool:
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def _bounded_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


@dataclass(frozen=True)
class RecorderConfig:
    enabled: bool
    backend_url: str
    service_token: str
    capture_interval_seconds: int
    audio_segment_seconds: int
    max_image_bytes: int

    @classmethod
    def from_env(cls):
        config = cls(
            enabled=_enabled(os.getenv('EVIDENCE_RECORDER_ENABLED')),
            backend_url=os.getenv('BACKEND_URL', '').rstrip('/'),
            service_token=os.getenv('ADMIN_API_KEY', ''),
            capture_interval_seconds=_bounded_int('CAPTURE_INTERVAL_SECONDS', 15, 5, 300),
            audio_segment_seconds=_bounded_int('AUDIO_SEGMENT_SECONDS', 10, 5, 30),
            max_image_bytes=_bounded_int('RECORDER_MAX_IMAGE_BYTES', 700_000, 100_000, 900_000),
        )
        if config.enabled and (not config.backend_url or not config.service_token):
            raise RuntimeError('Recorder enabled without BACKEND_URL or ADMIN_API_KEY')
        return config

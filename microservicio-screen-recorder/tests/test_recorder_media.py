import base64
import io
import wave

from PIL import Image

from recordings.media_payloads import encode_jpeg_data_url, encode_wav_data_url


def _decode(data_url: str):
    header, encoded = data_url.split(',', 1)
    return header, base64.b64decode(encoded)


def test_jpeg_payload_is_bounded_and_decodable():
    image = Image.new('RGB', (2400, 1800), color=(80, 120, 160))
    header, payload = _decode(encode_jpeg_data_url(image, 700_000))

    assert header == 'data:image/jpeg;base64'
    assert len(payload) <= 700_000
    decoded = Image.open(io.BytesIO(payload))
    assert max(decoded.size) <= 1280


def test_wav_payload_has_expected_audio_contract():
    pcm = b'\x00\x00' * 16_000
    header, payload = _decode(encode_wav_data_url([pcm]))

    assert header == 'data:audio/wav;base64'
    with wave.open(io.BytesIO(payload), 'rb') as wav_file:
        assert wav_file.getnchannels() == 1
        assert wav_file.getsampwidth() == 2
        assert wav_file.getframerate() == 16_000
        assert wav_file.getnframes() == 16_000

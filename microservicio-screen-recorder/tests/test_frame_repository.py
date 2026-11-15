import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

import frame_paths
from frame_models import ScreenFrame
from frame_repository import save_frame
from runtime_config import FRAME_RETENTION_SECONDS


class FakePipeline:
    def __init__(self):
        self.commands = []

    def __getattr__(self, name):
        def record(*args, **kwargs):
            self.commands.append((name, args, kwargs))
            return self
        return record


class FakeRedis:
    def __init__(self):
        self.last_pipeline = None

    def pipeline(self, transaction=True):
        self.last_pipeline = FakePipeline()
        return self.last_pipeline


class FrameRepositoryTests(unittest.TestCase):
    def test_save_and_delete_frame_inside_configured_root(self):
        import base64
        import io

        output = io.BytesIO()
        Image.new('RGB', (32, 24), 'blue').save(output, 'PNG')
        data_url = f"data:image/png;base64,{base64.b64encode(output.getvalue()).decode('ascii')}"
        frame = ScreenFrame(session_id='session-1', frame_data=data_url, timestamp=123, frame_type='camera')
        redis_client = FakeRedis()

        with tempfile.TemporaryDirectory() as directory, patch.object(
            frame_paths, 'storage_path', return_value=Path(directory)
        ):
            metadata = save_frame(frame, redis_client)
            target = frame_paths.frame_path('session-1', 'camera_123.jpg')
            self.assertTrue(target.is_file())
            self.assertEqual(metadata['storage_key'], 'session-1/camera_123.jpg')
            self.assertEqual(len(metadata['sha256']), 64)
            self.assertTrue(frame_paths.delete_frame('session-1', 'camera_123.jpg'))
            self.assertFalse(target.exists())

        self.assertIsNotNone(redis_client.last_pipeline)
        setex = next(command for command in redis_client.last_pipeline.commands if command[0] == 'setex')
        self.assertEqual(setex[1][1], FRAME_RETENTION_SECONDS)


if __name__ == '__main__':
    unittest.main()

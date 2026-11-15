import asyncio
import time

from runtime_config import FRAME_RETENTION_SECONDS, storage_path


def cleanup_expired_frames(now: float | None = None) -> int:
    root = storage_path()
    if not root.is_dir():
        return 0
    cutoff = (time.time() if now is None else now) - FRAME_RETENTION_SECONDS
    deleted = 0
    for session in root.iterdir():
        if session.is_symlink() or not session.is_dir():
            continue
        for frame in session.glob('*.jpg'):
            if frame.is_symlink() or not frame.is_file():
                continue
            if frame.stat().st_mtime < cutoff:
                frame.unlink(missing_ok=True)
                deleted += 1
        try:
            session.rmdir()
        except OSError:
            pass
    return deleted


async def retention_loop():
    while True:
        await asyncio.to_thread(cleanup_expired_frames)
        await asyncio.sleep(600)

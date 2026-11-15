import re
import shutil
from pathlib import Path

from fastapi import HTTPException

from runtime_config import storage_path

SESSION_PATTERN = re.compile(r'^[A-Za-z0-9._:-]{1,128}$')
FILE_PATTERN = re.compile(r'^(screen|camera|screenshot)_\d+\.jpg$')


def session_directory(session_id: str) -> Path:
    if not SESSION_PATTERN.fullmatch(session_id):
        raise HTTPException(status_code=422, detail='Invalid session id')
    return storage_path() / session_id


def frame_path(session_id: str, filename: str) -> Path:
    if not FILE_PATTERN.fullmatch(filename):
        raise HTTPException(status_code=422, detail='Invalid frame filename')
    return session_directory(session_id) / filename


def delete_frame(session_id: str, filename: str) -> bool:
    target = frame_path(session_id, filename)
    try:
        target.unlink()
        return True
    except FileNotFoundError:
        return False


def delete_session(session_id: str) -> bool:
    target = session_directory(session_id)
    if not target.exists():
        return False
    shutil.rmtree(target)
    return True

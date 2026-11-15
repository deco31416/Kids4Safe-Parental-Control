from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from frame_models import ScreenFrame
from frame_paths import delete_frame, delete_session, frame_path
from frame_repository import save_frame
from redis_runtime import remove_frame_metadata, remove_session_metadata
from shared import require_admin_api_key

router = APIRouter(prefix='/api', dependencies=[Depends(require_admin_api_key)])


def redis_from(request: Request):
    client = getattr(request.app.state, 'redis_client', None)
    if client is None:
        raise HTTPException(status_code=503, detail='Redis is not initialized')
    return client


@router.post('/save-frame')
def save(frame: ScreenFrame, request: Request):
    try:
        metadata = save_frame(frame, redis_from(request))
        return {'success': True, **metadata}
    except FileExistsError:
        raise HTTPException(status_code=409, detail='Frame already exists') from None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail='Failed to save frame') from None


@router.get('/frames/{session_id}/{filename}')
def get_frame(session_id: str, filename: str):
    target = frame_path(session_id, filename)
    if not target.is_file():
        raise HTTPException(status_code=404, detail='Frame not found')
    return FileResponse(target, media_type='image/jpeg', filename=filename)


@router.delete('/frames/{session_id}/{filename}')
def remove_frame(session_id: str, filename: str, request: Request):
    removed = delete_frame(session_id, filename)
    timestamp = int(filename.rsplit('_', 1)[1].removesuffix('.jpg'))
    remove_frame_metadata(redis_from(request), session_id, timestamp)
    return {'success': True, 'removed': removed}


@router.delete('/frames/{session_id}')
def remove_session(session_id: str, request: Request):
    removed = delete_session(session_id)
    remove_session_metadata(redis_from(request), session_id)
    return {'success': True, 'removed': removed}

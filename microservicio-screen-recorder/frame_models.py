from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from runtime_config import MAX_FRAME_BASE64_CHARS


class ScreenFrame(BaseModel):
    model_config = ConfigDict(extra='forbid')

    session_id: str = Field(min_length=1, max_length=128, pattern=r'^[A-Za-z0-9._:-]+$')
    frame_data: str = Field(min_length=4, max_length=MAX_FRAME_BASE64_CHARS)
    timestamp: int = Field(ge=0, le=4_102_444_800_000)
    frame_type: Literal['screen', 'camera', 'screenshot']

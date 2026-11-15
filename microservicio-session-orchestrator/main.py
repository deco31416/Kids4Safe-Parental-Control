import uvicorn

from orchestrator.application import app
from orchestrator.config import settings


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)

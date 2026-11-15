"""Compatibility entry point; the canonical application lives in main.py."""

from main import app, logger, settings


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting %s on port %s", settings.SERVICE_NAME, settings.PORT)
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        proxy_headers=False,
        access_log=False,
    )

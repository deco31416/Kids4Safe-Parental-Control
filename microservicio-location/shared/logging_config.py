import logging
import sys


def setup_logging(service_name: str, level: str = "INFO"):
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    logger = logging.getLogger()
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        f"%(asctime)s - {service_name} - %(levelname)s - %(message)s"
    ))
    logger.handlers = [handler]

    return logger

import logging
import sys


def setup_logging(service_name: str, log_level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(service_name)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    logger.propagate = False

    handler = logging.StreamHandler(sys.stdout)
    fmt = logging.Formatter(
        f"%(asctime)s - {service_name} - %(levelname)s - %(message)s"
    )
    handler.setFormatter(fmt)
    logger.handlers = [handler]
    return logger

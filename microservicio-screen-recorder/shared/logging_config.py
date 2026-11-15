import logging
import sys


def setup_logging(service_name: str):
    """
    Configura logging consistente para todos los microservicios
    """
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    fmt = logging.Formatter(
        f"%(asctime)s - {service_name} - %(levelname)s - %(message)s"
    )
    handler.setFormatter(fmt)
    logger.handlers = [handler]
    
    return logger

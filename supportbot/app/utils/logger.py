import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """Formatter que emite logs em formato JSON com campos obrigatórios."""

    def __init__(self, service: str) -> None:
        super().__init__()
        self.service = service

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "service": self.service,
            "message": record.getMessage(),
        }
        return json.dumps(log_entry, ensure_ascii=False)


def get_logger(service: str) -> logging.Logger:
    """Retorna um logger configurado para emitir JSON estruturado.

    Args:
        service: Nome do serviço que origina os logs.

    Returns:
        Logger configurado com JsonFormatter.
    """
    logger = logging.getLogger(service)

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter(service))
        logger.addHandler(handler)
        logger.propagate = False

    return logger

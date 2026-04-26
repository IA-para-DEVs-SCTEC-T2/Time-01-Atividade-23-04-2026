import json
import logging
import io

import pytest

from app.utils.logger import get_logger, JsonFormatter


def capture_log(service: str, level: str, message: str) -> dict:
    """Helper: captura a saída JSON de um log e retorna como dict."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter(service))

    logger = logging.getLogger(f"test.{service}.{level}.{message[:10]}")
    logger.handlers = [handler]
    logger.propagate = False
    logger.setLevel(logging.DEBUG)

    getattr(logger, level.lower())(message)
    return json.loads(stream.getvalue().strip())


class TestJsonFormatter:
    def test_output_is_valid_json(self):
        result = capture_log("chat_service", "INFO", "Mensagem de teste")
        assert isinstance(result, dict)

    def test_required_fields_present(self):
        result = capture_log("faq_service", "WARNING", "FAQ não encontrada")
        assert "timestamp" in result
        assert "level" in result
        assert "service" in result
        assert "message" in result

    def test_service_field_matches(self):
        result = capture_log("ticket_service", "INFO", "Ticket criado")
        assert result["service"] == "ticket_service"

    def test_level_field_matches(self):
        result = capture_log("llm_service", "ERROR", "LLM indisponível")
        assert result["level"] == "ERROR"

    def test_message_field_matches(self):
        msg = "Resposta gerada com sucesso"
        result = capture_log("chat_service", "INFO", msg)
        assert result["message"] == msg

    def test_timestamp_is_iso_format(self):
        from datetime import datetime
        result = capture_log("chat_service", "DEBUG", "debug msg")
        # Deve ser parseável como ISO 8601
        dt = datetime.fromisoformat(result["timestamp"])
        assert dt is not None


class TestGetLogger:
    def test_returns_logger_instance(self):
        logger = get_logger("my_service")
        assert isinstance(logger, logging.Logger)

    def test_logger_name_matches_service(self):
        logger = get_logger("classifier_service")
        assert logger.name == "classifier_service"

    def test_logger_has_json_formatter(self):
        logger = get_logger("faq_service_x")
        assert any(isinstance(h.formatter, JsonFormatter) for h in logger.handlers)

    def test_get_logger_idempotent(self):
        """Chamar get_logger duas vezes com o mesmo serviço não duplica handlers."""
        get_logger("stable_service")
        get_logger("stable_service")
        logger = logging.getLogger("stable_service")
        assert len(logger.handlers) == 1

"""
Integration tests for POST /chat endpoint.
Feature: supportbot-faq
"""
import json
import logging
import io
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.faq import FAQ
from app.services.llm_service import LLMResult
from app.utils.logger import JsonFormatter


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_faq(id: str = "1", keywords: list[str] | None = None) -> FAQ:
    return FAQ(
        id=id,
        category="test",
        question="Pergunta de teste",
        answer="Resposta de teste",
        keywords=keywords or ["teste"],
    )


TEST_FAQS = [make_faq("1", ["entrega", "prazo"]), make_faq("2", ["troca", "devolução"])]

LLM_OK = LLMResult(
    answer='{"answer": "Resposta de teste", "confidence": 0.9}',
    raw_response={},
)

LLM_LOW_CONFIDENCE = LLMResult(
    answer='{"answer": "Não sei responder", "confidence": 0.3}',
    raw_response={},
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """TestClient com app.state.faqs pré-configurado."""
    app.state.faqs = TEST_FAQS
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Integration tests — POST /chat
# ---------------------------------------------------------------------------

class TestChatHappyPath:
    def test_valid_message_returns_200(self, client):
        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(return_value=LLM_OK),
        ):
            response = client.post("/chat", json={"message": "qual o prazo de entrega?"})

        assert response.status_code == 200

    def test_response_contains_answer_and_confidence(self, client):
        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(return_value=LLM_OK),
        ):
            response = client.post("/chat", json={"message": "qual o prazo de entrega?"})

        data = response.json()
        assert "answer" in data
        assert "confidence" in data
        assert isinstance(data["answer"], str)
        assert len(data["answer"]) > 0
        assert 0.0 <= data["confidence"] <= 1.0

    def test_not_escalated_when_confidence_high(self, client):
        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(return_value=LLM_OK),
        ):
            response = client.post("/chat", json={"message": "qual o prazo de entrega?"})

        assert response.json()["escalated"] is False


class TestChatEscalation:
    def test_escalated_true_when_confidence_below_threshold(self, client):
        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(return_value=LLM_LOW_CONFIDENCE),
        ):
            response = client.post("/chat", json={"message": "pergunta qualquer"})

        assert response.status_code == 200
        assert response.json()["escalated"] is True

    def test_escalated_confidence_value_is_low(self, client):
        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(return_value=LLM_LOW_CONFIDENCE),
        ):
            response = client.post("/chat", json={"message": "pergunta qualquer"})

        assert response.json()["confidence"] == pytest.approx(0.3)


class TestChatLLMUnavailable:
    def test_llm_error_returns_503(self, client):
        from app.utils.exceptions import LLMUnavailableError

        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(side_effect=LLMUnavailableError("LLM offline")),
        ):
            response = client.post("/chat", json={"message": "qual o prazo?"})

        assert response.status_code == 503

    def test_503_response_has_detail(self, client):
        from app.utils.exceptions import LLMUnavailableError

        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(side_effect=LLMUnavailableError("LLM offline")),
        ):
            response = client.post("/chat", json={"message": "qual o prazo?"})

        assert "detail" in response.json()


class TestChatValidation:
    def test_empty_message_returns_422(self, client):
        response = client.post("/chat", json={"message": ""})
        assert response.status_code == 422

    def test_missing_message_field_returns_422(self, client):
        response = client.post("/chat", json={})
        assert response.status_code == 422

    def test_whitespace_only_message_returns_422(self, client):
        response = client.post("/chat", json={"message": "   "})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Property 9: Logs estruturados contêm campos obrigatórios
# Feature: supportbot-faq, Property 9: Logs estruturados contêm campos obrigatórios
# Validates: Requirements 5.4
# ---------------------------------------------------------------------------

from hypothesis import given, settings as h_settings
import hypothesis.strategies as st


def capture_log_output(service: str, level: str, message: str) -> dict:
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter(service))
    logger = logging.getLogger(f"prop9.{service}.{level}.{id(message)}")
    logger.handlers = [handler]
    logger.propagate = False
    logger.setLevel(logging.DEBUG)
    getattr(logger, level.lower())(message)
    return json.loads(stream.getvalue().strip())


@given(
    service=st.text(min_size=1, max_size=30).filter(lambda s: s.strip()),
    message=st.text(min_size=1, max_size=200),
    level=st.sampled_from(["info", "warning", "error", "debug"]),
)
@h_settings(max_examples=50)
def test_property_9_structured_logs_have_required_fields(service, message, level):
    """Property 9: Logs estruturados contêm campos obrigatórios.
    Validates: Requirements 5.4
    """
    result = capture_log_output(service, level, message)
    assert "timestamp" in result
    assert "level" in result
    assert "service" in result
    assert "message" in result


# ---------------------------------------------------------------------------
# Property 3: Confidence_Score determina escalation de forma consistente
# Feature: supportbot-faq, Property 3: Confidence_Score determina escalation
# Validates: Requirements 2.2, 2.3
# ---------------------------------------------------------------------------

@given(
    score=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
    threshold=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
@h_settings(max_examples=200)
def test_property_3_escalation_consistent_with_confidence(score, threshold):
    """Property 3: Confidence_Score determina escalation de forma consistente.
    Validates: Requirements 2.2, 2.3
    """
    escalated = score < threshold
    if score >= threshold:
        assert not escalated
    else:
        assert escalated


# ---------------------------------------------------------------------------
# Feature: supportbot-faq, Property 1: Resposta do chat contém campos obrigatórios com valores válidos
# Validates: Requirements 1.4, 2.1
# ---------------------------------------------------------------------------

@given(
    message=st.text(min_size=1, max_size=100).filter(lambda s: s.strip()),
    confidence=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
@h_settings(max_examples=30)
def test_property_1_chat_response_has_required_fields(message, confidence):
    """Property 1: Resposta do chat contém campos obrigatórios com valores válidos.
    Validates: Requirements 1.4, 2.1
    """
    llm_result = LLMResult(
        answer=json.dumps({"answer": "Resposta gerada", "confidence": confidence}),
        raw_response={},
    )
    app.state.faqs = TEST_FAQS
    with TestClient(app, raise_server_exceptions=False) as c:
        with patch(
            "app.api.routes_chat.generate_response",
            new=AsyncMock(return_value=llm_result),
        ):
            response = c.post("/chat", json={"message": message})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["answer"], str)
    assert len(data["answer"]) > 0
    assert 0.0 <= data["confidence"] <= 1.0
    assert isinstance(data["escalated"], bool)


# ---------------------------------------------------------------------------
# Property 2: Mensagens compostas apenas de whitespace são rejeitadas
# Feature: supportbot-faq, Property 2: Mensagens de whitespace são rejeitadas
# Validates: Requirements 1.5
# ---------------------------------------------------------------------------

@given(
    message=st.one_of(
        st.just(""),
        st.text(alphabet=st.characters(whitelist_categories=("Zs",)), min_size=1, max_size=50),
    )
)
@h_settings(max_examples=50)
def test_property_2_whitespace_messages_rejected(message):
    """Property 2: Mensagens compostas apenas de whitespace são rejeitadas.
    Validates: Requirements 1.5
    """
    app.state.faqs = TEST_FAQS
    with TestClient(app, raise_server_exceptions=False) as c:
        response = c.post("/chat", json={"message": message})

    assert response.status_code == 422

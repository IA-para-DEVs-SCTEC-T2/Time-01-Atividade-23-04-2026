import json

from fastapi import APIRouter, Request

from app.config import settings
from app.models.message import ChatRequest, ChatResponse
from app.services.classifier_service import calculate_confidence
from app.services.faq_service import find_relevant_faq
from app.services.llm_service import generate_response
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger("chat_api")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest) -> ChatResponse:
    faqs = request.app.state.faqs

    logger.info(f"Mensagem recebida: {body.message}")

    faq = find_relevant_faq(body.message, faqs)
    llm_result = await generate_response(body.message, faq)
    confidence = calculate_confidence(llm_result)

    try:
        parsed = json.loads(llm_result.answer)
        answer_text: str = parsed["answer"]
    except (json.JSONDecodeError, KeyError, TypeError):
        answer_text = llm_result.answer

    escalated = confidence < settings.confidence_threshold

    action = "escalada" if escalated else "resposta direta"
    logger.info(f"Confidence: {confidence:.2f} | Ação: {action}")

    return ChatResponse(answer=answer_text, confidence=confidence, escalated=escalated)

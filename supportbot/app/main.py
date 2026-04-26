import logging
import sys
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes_chat import router as chat_router
from app.api.routes_ticket import router as ticket_router
from app.config import settings
from app.repositories.faq_repository import load_faqs
from app.utils.exceptions import FAQLoadError, LLMUnavailableError
from app.utils.logger import get_logger

logger = get_logger("main")

logging.getLogger().setLevel(settings.log_level)

app = FastAPI(title="SupportBot FAQ API")


@app.on_event("startup")
async def startup_event() -> None:
    try:
        app.state.faqs = load_faqs(settings.faqs_path)
        logger.info(f"FAQs carregadas com sucesso: {len(app.state.faqs)} entradas")
    except FAQLoadError as e:
        logger.error(f"Falha ao carregar FAQs: {e}")
        sys.exit(1)


app.include_router(chat_router)
app.include_router(ticket_router)


@app.exception_handler(LLMUnavailableError)
async def llm_unavailable_handler(request: Request, exc: LLMUnavailableError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": "Serviço de IA temporariamente indisponível. Tente novamente em instantes."},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Erro interno não tratado: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor."},
    )

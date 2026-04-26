from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.ticket import TicketRequest, TicketResponse
from app.services.ticket_service import create_ticket
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger("ticket_api")


@router.post("/ticket", status_code=201)
def post_ticket(request: TicketRequest) -> JSONResponse:
    ticket = create_ticket(
        name=request.name,
        email=str(request.email),
        description=request.description,
    )
    logger.info(f"Ticket criado: ticket_id={ticket.ticket_id} email={ticket.email}")
    response = TicketResponse(
        ticket_id=ticket.ticket_id,
        message="Seu ticket foi registrado com sucesso. Nossa equipe entrará em contato em breve.",
    )
    return JSONResponse(content=response.model_dump(), status_code=201)

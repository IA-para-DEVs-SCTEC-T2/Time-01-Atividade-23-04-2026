from datetime import datetime, timezone
from uuid import uuid4

from app.models.ticket import Ticket
from app.repositories.ticket_repository import save_ticket


def create_ticket(name: str, email: str, description: str) -> Ticket:
    ticket = Ticket(
        ticket_id=str(uuid4()),
        name=name,
        email=email,
        description=description,
        created_at=datetime.now(timezone.utc),
    )
    save_ticket(ticket)
    return ticket

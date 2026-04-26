from app.models.ticket import Ticket

_store: dict[str, Ticket] = {}


def save_ticket(ticket: Ticket) -> str:
    _store[ticket.ticket_id] = ticket
    return ticket.ticket_id


def get_ticket(ticket_id: str) -> Ticket | None:
    return _store.get(ticket_id)

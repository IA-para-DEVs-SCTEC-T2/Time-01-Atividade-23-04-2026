from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class TicketRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    description: str = Field(..., min_length=1)

    @field_validator("name", "description")
    @classmethod
    def must_not_be_whitespace_only(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("O campo não pode conter apenas espaços em branco")
        return v


class Ticket(BaseModel):
    ticket_id: str
    name: str
    email: str
    description: str
    created_at: datetime


class TicketResponse(BaseModel):
    ticket_id: str
    message: str

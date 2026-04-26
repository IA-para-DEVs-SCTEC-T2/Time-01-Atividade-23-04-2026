from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message must not be blank or whitespace only")
        return v


class ChatResponse(BaseModel):
    answer: str
    confidence: float  # [0.0, 1.0]
    escalated: bool    # True quando confidence < threshold

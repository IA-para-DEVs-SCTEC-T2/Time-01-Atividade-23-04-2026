from pydantic import BaseModel


class FAQ(BaseModel):
    id: str
    category: str
    question: str
    answer: str
    keywords: list[str]

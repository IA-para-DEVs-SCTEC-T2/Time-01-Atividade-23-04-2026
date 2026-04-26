from pathlib import Path

import httpx
from pydantic import BaseModel

from app.config import settings
from app.models.faq import FAQ
from app.utils.exceptions import LLMUnavailableError

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


class LLMResult(BaseModel):
    answer: str
    raw_response: dict


async def generate_response(message: str, faq: FAQ | None) -> LLMResult:
    if faq is not None:
        prompt_path = _PROMPTS_DIR / "system_prompt.txt"
        prompt = prompt_path.read_text(encoding="utf-8").replace(
            "{faq_question}", faq.question
        ).replace(
            "{faq_answer}", faq.answer
        ).replace(
            "{user_message}", message
        )
    else:
        prompt_path = _PROMPTS_DIR / "fallback_prompt.txt"
        prompt = prompt_path.read_text(encoding="utf-8").replace(
            "{user_message}", message
        )

    payload = {
        "model": "llama-3.1-8b-instant",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": prompt}],
    }

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
            )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        raise LLMUnavailableError(f"LLM unreachable: {exc}") from exc

    if response.status_code != 200:
        raise LLMUnavailableError(
            f"LLM returned HTTP {response.status_code}: {response.text}"
        )

    raw: dict = response.json()
    answer_text: str = raw["choices"][0]["message"]["content"]

    return LLMResult(answer=answer_text, raw_response=raw)

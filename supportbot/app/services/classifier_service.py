import json

from app.services.llm_service import LLMResult


def calculate_confidence(llm_result: LLMResult) -> float:
    """Extract and normalize confidence score from LLM response.

    The LLM is expected to return JSON in the format:
        {"answer": "...", "confidence": 0.85}

    Returns a float in [0.0, 1.0]. Falls back to 0.0 on any parse failure.
    """
    try:
        parsed = json.loads(llm_result.answer)
        raw_score = float(parsed["confidence"])
        return max(0.0, min(1.0, raw_score))
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return 0.0

import json

from app.models.faq import FAQ
from app.utils.exceptions import FAQLoadError


def load_faqs(path: str) -> list[FAQ]:
    """Load and validate FAQs from a JSON file at the given path.

    Args:
        path: Path to the JSON file containing FAQ data.

    Returns:
        A list of validated FAQ objects.

    Raises:
        FAQLoadError: If the file is not found or contains invalid JSON.
    """
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError as e:
        raise FAQLoadError(f"FAQ file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise FAQLoadError(f"Invalid JSON in FAQ file: {path} — {e}") from e

    return [FAQ.model_validate(item) for item in data]

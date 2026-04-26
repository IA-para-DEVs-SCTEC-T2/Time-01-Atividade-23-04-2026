from app.models.faq import FAQ


def find_relevant_faq(message: str, faqs: list[FAQ]) -> FAQ | None:
    """Retorna a FAQ com mais keywords correspondentes na mensagem, ou None."""
    normalized = message.lower()

    best_faq: FAQ | None = None
    best_count = 0

    for faq in faqs:
        count = sum(1 for kw in faq.keywords if kw.lower() in normalized)
        if count > best_count:
            best_count = count
            best_faq = faq

    return best_faq if best_count >= 1 else None

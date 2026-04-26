class SupportBotError(Exception):
    """Base exception for all SupportBot errors."""


class LLMUnavailableError(SupportBotError):
    """Raised when the LLM provider is unreachable or returns an error."""


class FAQLoadError(SupportBotError):
    """Raised when the FAQ file cannot be loaded or parsed."""


class TicketPersistenceError(SupportBotError):
    """Raised when a ticket cannot be persisted."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    confidence_threshold: float = 0.7
    faqs_path: str = "data/faqs.json"
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

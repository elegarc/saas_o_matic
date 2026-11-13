"""Application configuration settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables or defaults."""

    app_name: str = "SaaS-O-Matic API"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    database_path: str = "data/saas_o_matic.db"
    cors_origins: list[str] = ["http://localhost:4200"]

    model_config = SettingsConfigDict(
        env_prefix="SAAS_O_MATIC_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()


"""Application settings loaded from environment variables via pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration sourced from environment variables."""

    database_url: str = "postgresql+asyncpg://lvmanager:lvmanager@db:5432/lvmanager"
    secret_key: str = "dev-secret-key-change-in-production"
    environment: str = "development"
    storage_backend: str = "local"
    storage_path: str = "/tmp/.storage"
    gaeb_max_file_size_mb: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return the cached application settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

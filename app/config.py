import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/matchinfluence")
    CHROMA_DB_PATH: str = "./chroma_data"
    
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://models.github.ai/inference")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gpt-4o-mini")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    
    # External Scraper Proxy Keys
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    APIFY_TOKEN: str = os.getenv("APIFY_TOKEN", "")
    APIFY_INSTAGRAM_URL: str = os.getenv("APIFY_INSTAGRAM_URL", "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items")
    DATA_REFRESH_INTERVAL_DAYS: int = int(os.getenv("DATA_REFRESH_INTERVAL_DAYS", "7"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        return init_settings, dotenv_settings, env_settings, file_secret_settings

# Instantiate settings to be imported across the app
settings = Settings()
import os

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    CHROMA_DB_PATH: str = "./chroma_data"
    
    # API Keys (To be used in later phases)
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://models.inference.ai.azure.com")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gpt-4o-mini")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    RAPIDAPI_KEY: str = os.getenv("RAPIDAPI_KEY", "")
    DATA_REFRESH_INTERVAL_DAYS: int = int(os.getenv("DATA_REFRESH_INTERVAL_DAYS", "7"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Instantiate settings to be imported across the app
settings = Settings()
import os

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    CHROMA_DB_PATH: str = "./chroma_data"
    
    # API Keys (To be used in later phases)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    RAPIDAPI_KEY: str = os.getenv("RAPIDAPI_KEY", "")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "openai/gpt-3.5-turbo")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Instantiate settings to be imported across the app
settings = Settings()
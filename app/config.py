from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/matchinfluence"
    CHROMA_DB_PATH: str = "./chroma_data"
    
    # API Keys (To be used in later phases)
    OPENAI_API_KEY: str = ""
    YOUTUBE_API_KEY: str = ""
    RAPIDAPI_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Instantiate settings to be imported across the app
settings = Settings()
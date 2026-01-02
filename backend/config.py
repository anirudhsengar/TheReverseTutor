"""
The Reverse Tutor - Configuration
"""

from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# Get the project root directory (parent of backend/)
PROJECT_ROOT = Path(__file__).parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    deepgram_api_key: str = ""
    openai_api_key: str = ""
    groq_api_key: str = ""
    tavily_api_key: str = ""
    
    # LLM Configuration
    llm_provider: str = "groq"  # "groq" or "openai"
    groq_model: str = "llama-3.3-70b-versatile"
    openai_model: str = "gpt-4o"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # Audio Configuration
    sample_rate: int = 16000
    
    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars not defined in Settings


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

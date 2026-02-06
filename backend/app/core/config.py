"""
Application Configuration
Loads environment variables with validation using Pydantic Settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All sensitive values MUST come from .env file.
    """
    
    # Database
    DATABASE_URL: str
    
    # JWT Configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # App
    DEBUG: bool = False
    
    # Twilio Configuration (Optional - for call campaigns)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    TWILIO_WEBHOOK_BASE_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings loader.
    Uses lru_cache to avoid re-reading .env on every request.
    """
    return Settings()

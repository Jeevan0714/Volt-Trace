import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage" / "documents"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "VoltTrace API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/volttrace.db"
    
    # Storage
    DOCUMENT_STORAGE_DIR: Path = STORAGE_DIR
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    
    # Gemini API Key (optional - system falls back to deterministic rule engine if missing)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        env_file = ".env"

settings = Settings()

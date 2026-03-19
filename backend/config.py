from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./clinica.db"
    SECRET_KEY: str = "clinica-estetica-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    PORT: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()

# Railway provides postgres:// but SQLAlchemy needs postgresql://
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "assinaturas"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "anexos"), exist_ok=True)

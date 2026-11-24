import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from backend/.env if present
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

class Settings(BaseModel):
    app_name: str = "STAGE API"
    app_description: str = "Backend API for the STAGE platform — Where Talent Meets Purpose"
    app_version: str = "1.0.0"
    database_path: str = os.getenv(
        "DATABASE_PATH",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "stage.db"))
    )
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    # Google Gemini & ADK Model Settings
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    ai_model: str = os.getenv("STAGE_AI_MODEL", "gemini-2.5-flash")

settings = Settings()


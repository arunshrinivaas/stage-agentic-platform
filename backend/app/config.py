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

    # Redis Venue Search Cache
    redis_url: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    venue_cache_ttl_seconds: int = int(os.getenv("VENUE_CACHE_TTL_SECONDS", "300"))

    # Apache Kafka Configuration
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "127.0.0.1:9092")
    kafka_topic: str = os.getenv("KAFKA_TOPIC", "stage.events")
    kafka_outbox_poll_interval_seconds: float = float(os.getenv("KAFKA_OUTBOX_POLL_INTERVAL_SECONDS", "0.5"))
    kafka_outbox_batch_size: int = int(os.getenv("KAFKA_OUTBOX_BATCH_SIZE", "50"))
    kafka_enabled: bool = os.getenv("KAFKA_ENABLED", "true").lower() in ("true", "1", "yes")

    @property
    def REDIS_URL(self) -> str:
        return self.redis_url

    @property
    def VENUE_CACHE_TTL_SECONDS(self) -> int:
        return self.venue_cache_ttl_seconds

    @property
    def KAFKA_BOOTSTRAP_SERVERS(self) -> str:
        return self.kafka_bootstrap_servers

    @property
    def KAFKA_TOPIC(self) -> str:
        return self.kafka_topic

settings = Settings()


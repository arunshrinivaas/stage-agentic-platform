from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.services.seed_data import seed_database
from app.services.agent_service import agent_service
from app.services.outbox_publisher import outbox_publisher
from app.services.kafka_consumers import consumer_manager
from app.routers import (
    auth_router,
    users_router,
    venues_router,
    requests_router,
    events_router,
    causes_router,
    notifications_router,
    ai_router,
    events_stats_router,
    passes_router,
    reminders_router,
    settlements_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and idempotent initial demonstration seed data
    init_db()
    seed_database()
    # Initialize multi-agent service and local MCP venue server integration
    await agent_service.initialize()
    # Initialize Kafka outbox publisher and consumer groups if enabled
    if settings.kafka_enabled:
        outbox_publisher.start()
        consumer_manager.start()

    try:
        yield
    finally:
        if settings.kafka_enabled:
            outbox_publisher.stop()
            consumer_manager.stop()
        await agent_service.shutdown()

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(venues_router)
app.include_router(requests_router)
app.include_router(events_router)
app.include_router(causes_router)
app.include_router(notifications_router)
app.include_router(ai_router)
app.include_router(events_stats_router)
app.include_router(passes_router)
app.include_router(reminders_router)
app.include_router(settlements_router)

@app.get("/")
def root():
    return {
        "app": "STAGE",
        "message": "Where talent meets purpose.",
        "status": "running",
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.services.seed_data import seed_database
from app.routers import (
    users_router,
    venues_router,
    requests_router,
    events_router,
    causes_router,
    notifications_router,
    ai_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and idempotent initial demonstration seed data
    init_db()
    seed_database()
    yield

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
app.include_router(users_router)
app.include_router(venues_router)
app.include_router(requests_router)
app.include_router(events_router)
app.include_router(causes_router)
app.include_router(notifications_router)
app.include_router(ai_router)

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

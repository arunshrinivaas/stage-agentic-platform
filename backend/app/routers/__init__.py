from app.routers.users import router as users_router
from app.routers.venues import router as venues_router
from app.routers.requests import router as requests_router
from app.routers.events import router as events_router
from app.routers.causes import router as causes_router
from app.routers.notifications import router as notifications_router
from app.routers.ai import router as ai_router

__all__ = [
    "users_router",
    "venues_router",
    "requests_router",
    "events_router",
    "causes_router",
    "notifications_router",
    "ai_router",
]


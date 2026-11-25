from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.venues import router as venues_router
from app.routers.requests import router as requests_router
from app.routers.events import router as events_router
from app.routers.causes import router as causes_router
from app.routers.notifications import router as notifications_router
from app.routers.ai import router as ai_router
from app.routers.events_stats import router as events_stats_router
from app.routers.passes import router as passes_router
from app.routers.reminders import router as reminders_router
from app.routers.settlements import router as settlements_router

__all__ = [
    "auth_router",
    "users_router",
    "venues_router",
    "requests_router",
    "events_router",
    "causes_router",
    "notifications_router",
    "ai_router",
    "events_stats_router",
    "passes_router",
    "reminders_router",
    "settlements_router",
]


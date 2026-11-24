from fastapi import APIRouter
from typing import List
from app.database import get_db
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notifications ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        return [
            NotificationResponse(
                id=r["id"],
                role=r["role"],
                title=r["title"],
                message=r["message"],
                timestamp=r["timestamp"],
                read=bool(r["read"]),
                type=r["type"],
            )
            for r in rows
        ]


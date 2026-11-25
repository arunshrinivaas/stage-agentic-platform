from fastapi import APIRouter
from typing import List, Optional
from app.database import get_db
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(role: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        if role:
            cursor.execute(
                "SELECT * FROM notifications WHERE role = ? OR role = 'all' ORDER BY created_at DESC;",
                (role,),
            )
        else:
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

@router.patch("/{notification_id}/read")
def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET read = 1 WHERE id = ?;", (notification_id,))
    return {"status": "success", "id": notification_id, "read": True}

@router.post("/mark-all-read")
def mark_all_notifications_read(role: Optional[str] = None):
    """Mark all notifications as read, optionally filtered by role."""
    with get_db() as conn:
        cursor = conn.cursor()
        if role:
            cursor.execute("UPDATE notifications SET read = 1 WHERE role = ? OR role = 'all';", (role,))
        else:
            cursor.execute("UPDATE notifications SET read = 1;")
    return {"status": "success", "message": "All notifications marked as read"}



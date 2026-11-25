"""FastAPI Router for Local Reminder Management."""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.routers.users import get_current_user
from app.services.reminder_service import (
    sync_user_reminders_from_platform_state,
    list_user_reminders,
    reschedule_reminder,
    update_reminder_status,
    create_custom_reminder,
)

router = APIRouter(prefix="/api/reminders", tags=["Reminders & Scheduling"])

class CreateReminderRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    target_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    target_time: Optional[str] = Field("19:00", description="HH:MM in 24hr format or '7:00 PM'")
    venue: Optional[str] = Field(None, max_length=150)
    category: Optional[str] = Field("custom")
    advance_hours: Optional[int] = Field(24, ge=1, le=168)

class RescheduleReminderRequest(BaseModel):
    new_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    new_time: Optional[str] = Field("19:00")

class StatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern=r"^(pending|completed|cancelled)$")

@router.get("")
def get_reminders(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve all reminders for authenticated user partitioned by pending, completed, and missed."""
    user_id = current_user["id"]
    role = current_user["role"]

    # Sync any new bookings or schedule items into reminders table
    sync_user_reminders_from_platform_state(user_id=user_id, role=role)

    return list_user_reminders(user_id)

@router.post("", status_code=201)
def create_reminder(
    payload: CreateReminderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new custom reminder with duplicate protection."""
    rem = create_custom_reminder(
        user_id=current_user["id"],
        title=payload.title,
        target_date=payload.target_date,
        target_time=payload.target_time,
        venue=payload.venue,
        category=payload.category,
        advance_hours=payload.advance_hours or 24,
    )
    return rem

@router.patch("/{reminder_id}/reschedule")
def reschedule(
    reminder_id: str,
    payload: RescheduleReminderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Reschedule an existing reminder."""
    success = reschedule_reminder(
        reminder_id=reminder_id,
        user_id=current_user["id"],
        new_date=payload.new_date,
        new_time=payload.new_time,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found or unauthorized")
    return {"status": "success", "message": f"Reminder rescheduled to {payload.new_date} at {payload.new_time}"}

@router.patch("/{reminder_id}/status")
def update_status(
    reminder_id: str,
    payload: StatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update reminder status to 'completed', 'cancelled', or 'pending'."""
    success = update_reminder_status(
        reminder_id=reminder_id,
        user_id=current_user["id"],
        status=payload.status,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found or unauthorized")
    return {"status": "success", "message": f"Reminder status updated to {payload.status}"}

@router.delete("/{reminder_id}")
def cancel_reminder(
    reminder_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cancel and remove a reminder."""
    success = update_reminder_status(
        reminder_id=reminder_id,
        user_id=current_user["id"],
        status="cancelled",
    )
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found or unauthorized")
    return {"status": "success", "message": "Reminder cancelled"}

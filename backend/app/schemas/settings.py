"""Pydantic schemas for User Settings and Profile Management."""
from typing import Optional, List
from pydantic import BaseModel, Field

class UserSettingsModel(BaseModel):
    user_id: str
    theme: str = Field("system", description="light, dark, system")
    layout_density: str = Field("comfortable", description="comfortable, compact")
    email_notifications: bool = True
    booking_confirmations: bool = True
    request_status_updates: bool = True
    cause_updates: bool = True
    ai_recommendations: bool = True
    proactive_ai_assistance: bool = True
    ai_notification_preferences: str = Field("all", description="all, urgent, none")
    preferred_recommendation_categories: List[str] = Field(
        default_factory=lambda: ["Music", "Theatre", "Dance", "Spoken Word"]
    )
    calendar_sync_enabled: bool = False
    calendar_provider: str = Field("download_ics", description="download_ics, google, apple")
    reminder_advance_hours: int = 24

class UserSettingsUpdateRequest(BaseModel):
    theme: Optional[str] = None
    layout_density: Optional[str] = None
    email_notifications: Optional[bool] = None
    booking_confirmations: Optional[bool] = None
    request_status_updates: Optional[bool] = None
    cause_updates: Optional[bool] = None
    ai_recommendations: Optional[bool] = None
    proactive_ai_assistance: Optional[bool] = None
    ai_notification_preferences: Optional[str] = None
    preferred_recommendation_categories: Optional[List[str]] = None
    calendar_sync_enabled: Optional[bool] = None
    calendar_provider: Optional[str] = None
    reminder_advance_hours: Optional[int] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


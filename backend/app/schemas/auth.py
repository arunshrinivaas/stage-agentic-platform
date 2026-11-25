from typing import Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = "demo123"
    demoRole: Optional[str] = Field(None, alias="demoRole")

    class Config:
        populate_by_name = True

class DemoLoginRequest(BaseModel):
    role: Literal["performer", "provider", "audience", "organiser", "admin"] = "performer"
    userId: Optional[str] = Field(None, alias="userId")

    class Config:
        populate_by_name = True

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str
    password: Optional[str] = "stage2026"
    role: Literal["performer", "provider", "audience", "organiser", "admin"] = "performer"
    avatarUrl: Optional[str] = Field(None, alias="avatarUrl")
    bio: Optional[str] = None
    artForm: Optional[str] = Field(None, alias="artForm")
    handle: Optional[str] = None
    venueName: Optional[str] = Field(None, alias="venueName")
    city: Optional[str] = None
    organization: Optional[str] = None
    focusArea: Optional[str] = Field(None, alias="focusArea")

    class Config:
        populate_by_name = True

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

    class Config:
        populate_by_name = True


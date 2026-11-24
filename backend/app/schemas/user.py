from typing import Optional
from pydantic import BaseModel

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    createdAt: str

    class Config:
        populate_by_name = True


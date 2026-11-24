from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: str
    role: str
    title: str
    message: str
    timestamp: str
    read: bool
    type: str

    class Config:
        populate_by_name = True


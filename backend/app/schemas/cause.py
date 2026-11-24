from typing import Optional
from pydantic import BaseModel, Field

class CauseOrganizer(BaseModel):
    name: str
    type: str
    verified: bool = True

class CauseCreate(BaseModel):
    title: str = Field(..., min_length=2)
    tagline: str
    description: str
    targetAmount: float = Field(..., alias="targetAmount")
    currency: Optional[str] = "₹"
    focusArea: str = Field(..., alias="focusArea")
    organizer: Optional[CauseOrganizer] = None
    imageUrl: Optional[str] = Field(
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&auto=format&fit=crop&q=85",
        alias="imageUrl"
    )

    class Config:
        populate_by_name = True

class CauseResponse(BaseModel):
    id: str
    title: str
    tagline: str
    description: str
    targetAmount: float
    currentAmount: float
    currency: str = "₹"
    linkedPerformancesCount: int
    organizer: CauseOrganizer
    focusArea: str
    imageUrl: str
    isDemonstration: bool = True

    class Config:
        populate_by_name = True


from typing import Optional, Literal
from pydantic import BaseModel, Field

class PerformanceRequestCreate(BaseModel):
    performerId: str = Field("perf-mehta", alias="performerId")
    performerName: str = Field("Aarav Mehta & Clara Dubois", alias="performerName")
    performerHandle: str = Field("@mehta.dubois", alias="performerHandle")
    title: str = Field(..., min_length=2)
    artForm: str = Field(..., alias="artForm")
    preferredLocation: str = Field(..., alias="preferredLocation")
    venueId: Optional[str] = Field(None, alias="venueId")
    venueName: Optional[str] = Field(None, alias="venueName")
    date: str
    time: Optional[str] = "7:00 PM"
    expectedAudienceSize: int = Field(100, alias="expectedAudienceSize")
    budget: float = Field(30000.0)
    currency: Optional[str] = "₹"
    description: str

    class Config:
        populate_by_name = True

class PerformanceRequestStatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "pending"]
    reviewNote: Optional[str] = Field(None, alias="reviewNote")

    class Config:
        populate_by_name = True

class PerformanceRequestResponse(BaseModel):
    id: str
    performerId: str
    performerName: str
    performerHandle: str
    title: str
    artForm: str
    preferredLocation: str
    venueId: Optional[str] = None
    venueName: Optional[str] = None
    date: str
    time: Optional[str] = None
    expectedAudienceSize: int
    budget: float
    currency: str = "₹"
    description: str
    status: str
    reviewNote: Optional[str] = None
    createdAt: str

    class Config:
        populate_by_name = True


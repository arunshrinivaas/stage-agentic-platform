from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class RequestStatusHistoryEntry(BaseModel):
    timestamp: str
    action: str
    fromStatus: Optional[str] = Field(None, alias="fromStatus")
    toStatus: str = Field(..., alias="toStatus")
    actorRole: str = Field(..., alias="actorRole")
    actorName: Optional[str] = Field(None, alias="actorName")
    note: Optional[str] = None

    class Config:
        populate_by_name = True

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
    technicalRider: Optional[str] = Field("", alias="technicalRider")
    durationMinutes: Optional[int] = Field(60, alias="durationMinutes")
    notes: Optional[str] = ""

    class Config:
        populate_by_name = True

class PerformanceRequestUpdate(BaseModel):
    title: Optional[str] = None
    artForm: Optional[str] = Field(None, alias="artForm")
    preferredLocation: Optional[str] = Field(None, alias="preferredLocation")
    venueId: Optional[str] = Field(None, alias="venueId")
    venueName: Optional[str] = Field(None, alias="venueName")
    date: Optional[str] = None
    time: Optional[str] = None
    expectedAudienceSize: Optional[int] = Field(None, alias="expectedAudienceSize")
    budget: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    technicalRider: Optional[str] = Field(None, alias="technicalRider")
    durationMinutes: Optional[int] = Field(None, alias="durationMinutes")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True

class PerformanceRequestStatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "pending", "returned", "withdrawn"]
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
    technicalRider: Optional[str] = ""
    durationMinutes: Optional[int] = 60
    notes: Optional[str] = ""
    updatedAt: Optional[str] = None
    statusHistory: List[RequestStatusHistoryEntry] = []

    class Config:
        populate_by_name = True

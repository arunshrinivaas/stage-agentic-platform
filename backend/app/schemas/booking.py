from typing import Optional
from pydantic import BaseModel, Field

class BookingCreate(BaseModel):
    eventId: str = Field(..., alias="eventId")
    ticketCount: int = Field(1, ge=1, le=10, alias="ticketCount")
    attendeeName: str = Field(..., alias="attendeeName")
    attendeeEmail: str = Field(..., alias="attendeeEmail")

    class Config:
        populate_by_name = True

class BookingResponse(BaseModel):
    id: str
    bookingCode: str
    eventId: str
    eventTitle: str
    eventArtForm: str
    eventDate: str
    eventTime: str
    venueName: str
    city: str
    ticketCount: int
    totalPaid: float
    currency: str = "₹"
    attendeeName: str
    attendeeEmail: str
    linkedCauseName: Optional[str] = None
    causeContributionAmount: Optional[float] = 0.0
    bookedAt: str
    qrCodePlaceholder: str
    status: str = "confirmed"
    isSimulated: bool = True

    class Config:
        populate_by_name = True


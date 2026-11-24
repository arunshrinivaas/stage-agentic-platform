from typing import Optional
from pydantic import BaseModel

class EventPerformer(BaseModel):
    name: str
    handle: str
    avatarUrl: str
    bio: str

class EventLocation(BaseModel):
    venueName: str
    neighborhood: str
    city: str
    isIndoor: bool

class EventSeats(BaseModel):
    total: int
    available: int
    priceLabel: str
    status: str

class EventLinkedCause(BaseModel):
    id: str
    name: str
    percentageContribution: float

class EventResponse(BaseModel):
    id: str
    title: str
    performer: EventPerformer
    artForm: str
    subGenre: str
    date: str
    time: str
    dateTimeISO: str
    location: EventLocation
    seats: EventSeats
    imageUrl: str
    description: str
    linkedCause: Optional[EventLinkedCause] = None
    isDemonstration: bool = True
    featured: Optional[bool] = False

    class Config:
        populate_by_name = True


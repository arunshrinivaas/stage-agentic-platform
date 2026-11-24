from typing import Optional, List
from pydantic import BaseModel, Field

class VenueLocation(BaseModel):
    address: str
    neighborhood: str
    city: str

class VenueCapacity(BaseModel):
    seated: int
    standing: int
    formatted: str

class VenueHost(BaseModel):
    name: str
    role: str
    policy: str

class VenueCreate(BaseModel):
    name: str = Field(..., min_length=2)
    venueType: str = Field(..., alias="venueType")
    location: VenueLocation
    capacity: VenueCapacity
    suitableCategories: List[str] = Field(default_factory=list, alias="suitableCategories")
    amenities: List[str] = Field(default_factory=list)
    availabilityNotice: Optional[str] = Field("Open for Weekend Dusk & Evening slots", alias="availabilityNotice")
    availabilityStatus: Optional[str] = Field("open_slots", alias="availabilityStatus")
    host: VenueHost
    imageUrl: Optional[str] = Field(
        "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=900&auto=format&fit=crop&q=85",
        alias="imageUrl"
    )

    class Config:
        populate_by_name = True

class VenueResponse(BaseModel):
    id: str
    name: str
    venueType: str
    location: VenueLocation
    capacity: VenueCapacity
    suitableCategories: List[str]
    amenities: List[str]
    availabilityNotice: str
    availabilityStatus: str
    host: VenueHost
    imageUrl: str
    isDemonstration: bool = True

    class Config:
        populate_by_name = True


from pydantic import BaseModel

class ContributionResponse(BaseModel):
    id: str
    causeId: str
    causeTitle: str
    eventId: str
    eventTitle: str
    performerName: str
    venueName: str
    date: str
    ticketsSold: int
    grossProceeds: float
    pledgedPercentage: float
    impactAmount: float
    currency: str = "₹"
    isSimulated: bool = True

    class Config:
        populate_by_name = True


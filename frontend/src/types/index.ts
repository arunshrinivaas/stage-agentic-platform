export type ArtCategory =
  | "All"
  | "Music"
  | "Dance"
  | "Theatre"
  | "Spoken Word"
  | "Street Performance";

export type RoleType = "performer" | "provider" | "audience" | "organiser";

export interface PerformanceEvent {
  id: string;
  title: string;
  performer: {
    name: string;
    handle: string;
    avatarUrl: string;
    bio: string;
  };
  artForm: Exclude<ArtCategory, "All">;
  subGenre: string;
  date: string;
  time: string;
  dateTimeISO: string;
  location: {
    venueName: string;
    neighborhood: string;
    city: string;
    isIndoor: boolean;
  };
  seats: {
    total: number;
    available: number;
    priceLabel: string;
    status: "available" | "limited" | "sold_out";
  };
  imageUrl: string;
  description: string;
  linkedCause?: {
    id: string;
    name: string;
    percentageContribution: number;
  };
  isDemonstration: boolean;
  featured?: boolean;
}

export interface StageVenue {
  id: string;
  name: string;
  venueType: string;
  location: {
    address: string;
    neighborhood: string;
    city: string;
  };
  capacity: {
    seated: number;
    standing: number;
    formatted: string;
  };
  suitableCategories: Array<Exclude<ArtCategory, "All">>;
  amenities: string[];
  availabilityNotice: string;
  availabilityStatus: "open_slots" | "curated_application" | "weekend_only";
  host: {
    name: string;
    role: string;
    policy: string;
  };
  imageUrl: string;
  isDemonstration: boolean;
}

export interface SocialCause {
  id: string;
  title: string;
  tagline: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  linkedPerformancesCount: number;
  organizer: {
    name: string;
    type: string;
    verified: boolean;
  };
  focusArea: string;
  imageUrl: string;
  isDemonstration: boolean;
}

export interface PerformanceRequest {
  id: string;
  performerId: string;
  performerName: string;
  performerHandle: string;
  title: string;
  artForm: Exclude<ArtCategory, "All">;
  preferredLocation: string;
  venueId?: string;
  venueName?: string;
  date: string;
  time?: string;
  expectedAudienceSize: number;
  budget: number;
  currency: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewNote?: string;
}

export interface AudienceBooking {
  id: string;
  bookingCode: string;
  eventId: string;
  eventTitle: string;
  eventArtForm: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  city: string;
  ticketCount: number;
  totalPaid: number;
  currency: string;
  attendeeName: string;
  attendeeEmail: string;
  linkedCauseName?: string;
  causeContributionAmount?: number;
  bookedAt: string;
  qrCodePlaceholder: string;
  status: "confirmed" | "attended" | "cancelled";
}

export interface PlatformNotification {
  id: string;
  role: RoleType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "request" | "approval" | "booking" | "cause" | "system";
}

export interface LedgerEntry {
  id: string;
  causeId: string;
  causeTitle: string;
  eventId: string;
  eventTitle: string;
  performerName: string;
  venueName: string;
  date: string;
  ticketsSold: number;
  grossProceeds: number;
  pledgedPercentage: number;
  impactAmount: number;
  currency: string;
}

export interface AgentExecutionEvent {
  agent_name: string;
  event_type: string;
  tool_name?: string | null;
  tool_input?: Record<string, unknown> | null;
  tool_output?: unknown;
  message?: string | null;
  timestamp: number;
}

export interface AiCommandResponse {
  session_id: string;
  final_response: string;
  selected_specialist_agents: string[];
  execution_status: string;
  execution_mode: string;
  agent_execution_events: AgentExecutionEvent[];
  model_used: string;
  created_at: string;
}

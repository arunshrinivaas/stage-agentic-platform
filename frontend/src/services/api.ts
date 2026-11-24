import {
  StageVenue,
  PerformanceEvent,
  SocialCause,
  PerformanceRequest,
  AudienceBooking,
  PlatformNotification,
  LedgerEntry,
  AiCommandResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorMessage = errorJson.detail;
      }
    } catch {
      // Use fallback error message
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Venues
  getVenues: () => request<StageVenue[]>("/api/venues"),
  createVenue: (venue: Omit<StageVenue, "id" | "isDemonstration">) =>
    request<StageVenue>("/api/venues", {
      method: "POST",
      body: JSON.stringify(venue),
    }),

  // Performance Requests
  getRequests: () => request<PerformanceRequest[]>("/api/requests"),
  createRequest: (
    req: Omit<PerformanceRequest, "id" | "status" | "createdAt">
  ) =>
    request<PerformanceRequest>("/api/requests", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateRequestStatus: (
    requestId: string,
    status: "approved" | "rejected" | "pending",
    reviewNote?: string
  ) =>
    request<PerformanceRequest>(`/api/requests/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reviewNote }),
    }),

  // Events & Bookings
  getEvents: () => request<PerformanceEvent[]>("/api/events"),
  getBookings: () => request<AudienceBooking[]>("/api/bookings"),
  createBooking: (payload: {
    eventId: string;
    ticketCount: number;
    attendeeName: string;
    attendeeEmail: string;
  }) =>
    request<AudienceBooking>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Causes & Contributions
  getCauses: () => request<SocialCause[]>("/api/causes"),
  createCause: (
    cause: Omit<
      SocialCause,
      "id" | "currentAmount" | "linkedPerformancesCount" | "isDemonstration"
    >
  ) =>
    request<SocialCause>("/api/causes", {
      method: "POST",
      body: JSON.stringify(cause),
    }),
  getContributions: () => request<LedgerEntry[]>("/api/contributions"),

  // Notifications
  getNotifications: () =>
    request<PlatformNotification[]>("/api/notifications"),

  // Health
  checkHealth: () => request<{ status: string }>("/health"),

  // AI Command Centre
  executeAiCommand: (payload: {
    user_id: string;
    message: string;
    session_id?: string;
  }) =>
    request<AiCommandResponse>("/api/ai/command", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};


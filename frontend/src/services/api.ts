import {
  StageVenue,
  PerformanceEvent,
  SocialCause,
  PerformanceRequest,
  AudienceBooking,
  PlatformNotification,
  LedgerEntry,
  AiCommandResponse,
  User,
  RoleType,
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
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Safely inject Bearer token from localStorage in browser environment
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("stage_auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Ignore localStorage access issues
    }
  }

  const response = await fetch(url, {
    headers: {
      ...headers,
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
  // Authentication
  login: (payload: { email: string; password?: string; demoRole?: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  demoLogin: (payload: { role: RoleType | "admin"; userId?: string }) =>
    request<{ token: string; user: User }>("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload: {
    name: string;
    email: string;
    password?: string;
    role: RoleType | "admin";
    avatarUrl?: string;
    bio?: string;
    artForm?: string;
    handle?: string;
    venueName?: string;
    city?: string;
    organization?: string;
    focusArea?: string;
  }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMe: () => request<User>("/api/auth/me"),
  logout: () =>
    request<{ status: string; message: string }>("/api/auth/logout", {
      method: "POST",
    }),

  // Venues
  getVenues: () => request<StageVenue[]>("/api/venues"),
  createVenue: (venue: Omit<StageVenue, "id" | "isDemonstration">) =>
    request<StageVenue>("/api/venues", {
      method: "POST",
      body: JSON.stringify(venue),
    }),

  // Performance Requests
  getRequests: () => request<PerformanceRequest[]>("/api/requests"),
  getRequest: (id: string) => request<PerformanceRequest>(`/api/requests/${id}`),
  createRequest: (
    req: Omit<PerformanceRequest, "id" | "status" | "createdAt">
  ) =>
    request<PerformanceRequest>("/api/requests", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateRequest: (
    requestId: string,
    updates: Partial<PerformanceRequest>
  ) =>
    request<PerformanceRequest>(`/api/requests/${requestId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  withdrawRequest: (requestId: string) =>
    request<PerformanceRequest>(`/api/requests/${requestId}/withdraw`, {
      method: "POST",
    }),
  resubmitRequest: (requestId: string) =>
    request<PerformanceRequest>(`/api/requests/${requestId}/resubmit`, {
      method: "POST",
    }),
  updateRequestStatus: (
    requestId: string,
    status: "approved" | "rejected" | "pending" | "returned" | "withdrawn",
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
  markNotificationRead: (id: string) =>
    request<{ status: string; id: string; read: boolean }>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    }),
  markAllNotificationsRead: (role?: string) =>
    request<{ status: string; message: string }>(role ? `/api/notifications/mark-all-read?role=${role}` : "/api/notifications/mark-all-read", {
      method: "POST",
    }),

  // Health & System Diagnostics
  checkHealth: () => request<{ status: string }>("/health"),
  getEventStats: () => request<{
    status: string;
    kafka_connected: boolean;
    broker: string;
    topic: string;
    outbox: any;
    consumers: any;
  }>("/api/events/stats"),
  getVenueCacheStats: () => request<{
    redis_connected: boolean;
    namespace: string;
    generation: number;
    cached_keys: number;
    hits: number;
    misses: number;
    hit_rate: string;
  }>("/api/venues/cache/stats"),

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

  // User Settings & Profile
  getUserSettings: () => request<import("@/types").UserSettings>("/api/users/me/settings"),
  updateUserSettings: (settings: Partial<import("@/types").UserSettings>) =>
    request<import("@/types").UserSettings>("/api/users/me/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  updateUserProfile: (profile: { name?: string; bio?: string; avatar_url?: string }) =>
    request<User>("/api/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  changePassword: (payload: { current_password: string; new_password: string }) =>
    request<{ status: string; message: string }>("/api/users/me/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Calendar & Reminders
  getReminders: () =>
    request<{ reminders: import("@/types").ReminderItem[]; total: number }>("/api/users/me/reminders"),
  getCalendarExportUrl: () => `${API_BASE_URL}/api/users/me/calendar.ics`,

  // External Auth & Phone
  getOAuthProviders: () =>
    request<import("@/types").OAuthProvidersStatus>("/api/auth/oauth/providers"),
  sendPhoneOtp: (phone: string) =>
    request<{ status: string; phone: string; message: string; testOtp: string }>("/api/auth/phone/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyPhoneOtp: (payload: { phone: string; code: string; role?: string; name?: string }) =>
    request<{ token: string; user: User }>("/api/auth/phone/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Digital Passes & QR Verification
  getPassForBooking: (bookingId: string) =>
    request<any>(`/api/passes/booking/${bookingId}`),
  verifyPassToken: (token: string) =>
    request<{ valid: boolean; status: string; message: string; passDetails?: any }>(`/api/passes/verify/${encodeURIComponent(token)}`),
  checkInPass: (token: string, deviceInfo?: string) =>
    request<{ status: string; message: string; passDetails: any }>("/api/passes/check-in", {
      method: "POST",
      body: JSON.stringify({ token, device_info: deviceInfo || "web-scanner" }),
    }),
  getCheckinAudits: () =>
    request<any[]>("/api/passes/audit/check-ins"),

  // Reminders Management
  getUserReminders: () =>
    request<{ pending: any[]; completed: any[]; missed: any[]; total: number; timezone: string }>("/api/reminders"),
  createReminder: (payload: { title: string; target_date: string; target_time?: string; venue?: string; category?: string; advance_hours?: number }) =>
    request<any>("/api/reminders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  rescheduleReminder: (reminderId: string, newDate: string, newTime?: string) =>
    request<{ status: string; message: string }>(`/api/reminders/${reminderId}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ new_date: newDate, new_time: newTime || "19:00" }),
    }),
  updateReminderStatus: (reminderId: string, status: "pending" | "completed" | "cancelled") =>
    request<{ status: string; message: string }>(`/api/reminders/${reminderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteReminder: (reminderId: string) =>
    request<{ status: string; message: string }>(`/api/reminders/${reminderId}`, {
      method: "DELETE",
    }),

  // Financial Settlements & Ledger
  previewAllocation: (grossAmount: number, perfPct?: number, causePct?: number, platPct?: number) =>
    request<{ status: string; allocation: any; disclaimer: string }>("/api/settlements/calculate-preview", {
      method: "POST",
      body: JSON.stringify({
        gross_amount: grossAmount,
        performer_pct: perfPct ?? 70.0,
        cause_pct: causePct ?? 20.0,
        platform_pct: platPct ?? 10.0,
      }),
    }),
  listSettlements: (status?: string) =>
    request<any[]>(status ? `/api/settlements?status=${status}` : "/api/settlements"),
  getSettlement: (settlementId: string) =>
    request<{ settlement: any; reconciliation: any }>(`/api/settlements/${settlementId}`),
  executeSettlement: (settlementId: string) =>
    request<{ status: string; message: string; settlement: any; reconciliation: any }>(`/api/settlements/${settlementId}/execute`, {
      method: "POST",
    }),
  auditSettlement: (settlementId: string) =>
    request<any>(`/api/settlements/${settlementId}/reconciliation`),

  // AI Performance & Streaming
  getAiPerformanceMetrics: () =>
    request<any>("/api/ai/performance-metrics"),
};

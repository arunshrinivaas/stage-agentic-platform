"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  RoleType,
  UserRole,
  User,
  PerformanceEvent,
  StageVenue,
  SocialCause,
  PerformanceRequest,
  AudienceBooking,
  PlatformNotification,
  LedgerEntry,
} from "@/types";
import {
  MOCK_PERFORMANCES,
  MOCK_VENUES,
  MOCK_CAUSES,
} from "@/data/mockData";
import { api } from "@/services/api";

const INITIAL_REQUESTS: PerformanceRequest[] = [
  {
    id: "req-01",
    performerId: "perf-mehta",
    performerName: "Aarav Mehta & Clara Dubois",
    performerHandle: "@mehta.dubois",
    title: "Echoes of the Ghats: Sitar & Cello Dialogue",
    artForm: "Music",
    preferredLocation: "Kolkata Waterfront",
    venueId: "venue-01",
    venueName: "The Vault Amphitheater",
    date: "2026-11-28",
    time: "7:30 PM",
    expectedAudienceSize: 120,
    budget: 35000,
    currency: "₹",
    description:
      "An acoustic chamber dialogue between sitar and French cello. Natural stone acoustic setup requested.",
    status: "approved",
    createdAt: "2026-11-14",
    technicalRider: "2 Shure SM81 condenser mics, 1 XLR line for acoustic sitar bridge pickup, sprung platform.",
    durationMinutes: 75,
    notes: "Requires dusk lighting progression.",
    reviewNote:
      "Approved. Sound technician assigned for natural stone acoustic balance.",
    statusHistory: [
      {
        timestamp: "2026-11-14 10:00:00",
        action: "created",
        toStatus: "pending",
        actorRole: "performer",
        actorName: "Aarav Mehta",
        note: "Initial pitch submitted.",
      },
      {
        timestamp: "2026-11-15 14:30:00",
        action: "status_approved",
        fromStatus: "pending",
        toStatus: "approved",
        actorRole: "provider",
        actorName: "The Vault Amphitheater",
        note: "Approved. Sound technician assigned for natural stone acoustic balance.",
      },
    ],
  },
  {
    id: "req-02",
    performerId: "perf-mehta",
    performerName: "Aarav Mehta & Clara Dubois",
    performerHandle: "@mehta.dubois",
    title: "Monsoon Rhythms: Tarang & Pakhawaj Chamber Session",
    artForm: "Music",
    preferredLocation: "Mumbai Textile Mills",
    venueId: "venue-02",
    venueName: "The Heritage Mill Loft",
    date: "2026-12-18",
    time: "6:30 PM",
    expectedAudienceSize: 85,
    budget: 28000,
    currency: "₹",
    description:
      "Intimate dusk acoustic recital exploring seasonal Malhar ragas with guest pakhawaj player.",
    status: "pending",
    createdAt: "2026-11-20",
    technicalRider: "3 floor microphones, acoustic monitor wedges, natural warm lighting.",
    durationMinutes: 60,
    notes: "Acoustic chamber setup with sitar & pakhawaj.",
    statusHistory: [
      {
        timestamp: "2026-11-20 16:45:00",
        action: "created",
        toStatus: "pending",
        actorRole: "performer",
        actorName: "Aarav Mehta",
        note: "Pitch submitted for curated application.",
      },
    ],
  },
  {
    id: "req-03",
    performerId: "perf-raghavan",
    performerName: "Divya Raghavan Movement Ensemble",
    performerHandle: "@divya.raghavan.dance",
    title: "Rhythm in Concrete: Contemporary Kathak Showcase",
    artForm: "Dance",
    preferredLocation: "Mumbai Textile Mills",
    venueId: "venue-02",
    venueName: "The Heritage Mill Loft",
    date: "2026-11-29",
    time: "6:00 PM",
    expectedAudienceSize: 90,
    budget: 45000,
    currency: "₹",
    description:
      "Full stage dance performance requiring sprung Harlequin floor and perimeter blackout curtains.",
    status: "approved",
    createdAt: "2026-11-10",
    technicalRider: "Harlequin sprung dance floor, side booms, perimeter blackout drapes.",
    durationMinutes: 80,
    reviewNote: "Approved. Sprung floor reserved and lighting tech allocated.",
    statusHistory: [
      {
        timestamp: "2026-11-10 11:20:00",
        action: "created",
        toStatus: "pending",
        actorRole: "performer",
        actorName: "Divya Raghavan",
      },
      {
        timestamp: "2026-11-12 18:00:00",
        action: "status_approved",
        fromStatus: "pending",
        toStatus: "approved",
        actorRole: "provider",
        actorName: "Priya Sanghavi",
        note: "Approved. Sprung floor reserved and lighting tech allocated.",
      },
    ],
  },
  {
    id: "req-04",
    performerId: "perf-mehta",
    performerName: "Aarav Mehta & Clara Dubois",
    performerHandle: "@mehta.dubois",
    title: "Midnight Electronic Sitar Rave",
    artForm: "Music",
    preferredLocation: "Bengaluru Fort Quarter",
    venueId: "venue-04",
    venueName: "Acoustic Cellar at Old Mill",
    date: "2026-12-24",
    time: "11:30 PM",
    expectedAudienceSize: 110,
    budget: 60000,
    currency: "₹",
    description: "High SPL amplified electronic fusion with subwoofers.",
    status: "rejected",
    createdAt: "2026-11-12",
    technicalRider: "High-decibel PA system, dual 18-inch subwoofers, laser rig.",
    durationMinutes: 120,
    reviewNote:
      "Declined: Exceeds acoustic listening room decibel and capacity thresholds.",
    statusHistory: [
      {
        timestamp: "2026-11-12 21:00:00",
        action: "created",
        toStatus: "pending",
        actorRole: "performer",
        actorName: "Aarav Mehta",
      },
      {
        timestamp: "2026-11-13 10:15:00",
        action: "status_rejected",
        fromStatus: "pending",
        toStatus: "rejected",
        actorRole: "provider",
        actorName: "Acoustic Cellar Host",
        note: "Declined: Exceeds acoustic listening room decibel and capacity thresholds.",
      },
    ],
  },
  {
    id: "req-05",
    performerId: "perf-mehta",
    performerName: "Aarav Mehta & Clara Dubois",
    performerHandle: "@mehta.dubois",
    title: "Heritage Garden Twilight Recital",
    artForm: "Music",
    preferredLocation: "South Waterfront",
    venueId: "venue-01",
    venueName: "The Vault Amphitheater",
    date: "2026-12-05",
    time: "5:30 PM",
    expectedAudienceSize: 95,
    budget: 32000,
    currency: "₹",
    description: "Chamber session during dusk. Requested outdoor amphitheatre stage.",
    status: "returned",
    createdAt: "2026-11-22",
    technicalRider: "Acoustic shell, 2 dynamic instrument mics, natural stone sound reflection.",
    durationMinutes: 65,
    reviewNote: "Host note: Please adjust proposed start time to 6:30 PM to avoid overlapping with prior load-out.",
    statusHistory: [
      {
        timestamp: "2026-11-22 09:30:00",
        action: "created",
        toStatus: "pending",
        actorRole: "performer",
        actorName: "Aarav Mehta",
      },
      {
        timestamp: "2026-11-23 15:40:00",
        action: "status_returned",
        fromStatus: "pending",
        toStatus: "returned",
        actorRole: "provider",
        actorName: "The Vault Amphitheater",
        note: "Host note: Please adjust proposed start time to 6:30 PM to avoid overlapping with prior load-out.",
      },
    ],
  },
];

const INITIAL_BOOKINGS: AudienceBooking[] = [
  {
    id: "book-01",
    bookingCode: "STG-8821-KOL",
    eventId: "evt-01",
    eventTitle: "Echoes of the Ghats: Sitar & Cello Dialogue",
    eventArtForm: "Music",
    eventDate: "Sat, Nov 28",
    eventTime: "7:30 PM",
    venueName: "The Vault Amphitheater",
    city: "Kolkata",
    ticketCount: 2,
    totalPaid: 900,
    currency: "₹",
    attendeeName: "Rhea Sen",
    attendeeEmail: "rhea.sen@example.com",
    linkedCauseName: "Instruments for Riverbank Classrooms",
    causeContributionAmount: 270,
    bookedAt: "2026-11-21T14:30:00",
    qrCodePlaceholder: "STG-QR-ECHOES-8821",
    status: "confirmed",
  },
  {
    id: "book-02",
    bookingCode: "STG-4409-MUM",
    eventId: "evt-03",
    eventTitle: "The Unspoken Monologues: Voices from the Margin",
    eventArtForm: "Theatre",
    eventDate: "Thu, Dec 03",
    eventTime: "8:00 PM",
    venueName: "Blackbox Studio 4",
    city: "Mumbai",
    ticketCount: 1,
    totalPaid: 350,
    currency: "₹",
    attendeeName: "Rhea Sen",
    attendeeEmail: "rhea.sen@example.com",
    linkedCauseName: "Shelter Stories: Creative Therapy for Youth",
    causeContributionAmount: 140,
    bookedAt: "2026-11-22T09:15:00",
    qrCodePlaceholder: "STG-QR-MONO-4409",
    status: "confirmed",
  },
];

const INITIAL_LEDGER: LedgerEntry[] = [
  {
    id: "led-01",
    causeId: "cause-01",
    causeTitle: "Instruments for Riverbank Classrooms",
    eventId: "evt-01",
    eventTitle: "Echoes of the Ghats: Sitar & Cello Dialogue",
    performerName: "Aarav Mehta & Clara Dubois",
    venueName: "The Vault Amphitheater",
    date: "2026-11-21",
    ticketsSold: 96,
    grossProceeds: 43200,
    pledgedPercentage: 30,
    impactAmount: 12960,
    currency: "₹",
  },
  {
    id: "led-02",
    causeId: "cause-02",
    causeTitle: "Shelter Stories: Creative Therapy for Youth",
    eventId: "evt-03",
    eventTitle: "The Unspoken Monologues",
    performerName: "The Soliloquy Collective",
    venueName: "Blackbox Studio 4",
    date: "2026-11-20",
    ticketsSold: 27,
    grossProceeds: 9450,
    pledgedPercentage: 40,
    impactAmount: 3780,
    currency: "₹",
  },
  {
    id: "led-03",
    causeId: "cause-03",
    causeTitle: "Preserving Delta Folk & Classical Traditions",
    eventId: "evt-02",
    eventTitle: "Shadows in Concrete: Contemporary Kathak",
    performerName: "Divya Raghavan Movement Ensemble",
    venueName: "The Heritage Mill Loft",
    date: "2026-11-19",
    ticketsSold: 78,
    grossProceeds: 46800,
    pledgedPercentage: 25,
    impactAmount: 11700,
    currency: "₹",
  },
  {
    id: "led-04",
    causeId: "cause-04",
    causeTitle: "Green Stages: Low-Carbon Public Art",
    eventId: "evt-05",
    eventTitle: "Brass & Echoes: Sunset Promenade Fanfare",
    performerName: "Old Town Brass Brigade",
    venueName: "The Sunken Garden Pavilion",
    date: "2026-11-18",
    ticketsSold: 140,
    grossProceeds: 28000,
    pledgedPercentage: 50,
    impactAmount: 14000,
    currency: "₹",
  },
];

const INITIAL_NOTIFICATIONS: PlatformNotification[] = [
  {
    id: "notif-01",
    role: "performer",
    title: "Stage Request Approved",
    message: "The Vault Amphitheater approved 'Echoes of the Ghats' for Nov 28.",
    timestamp: "2 hours ago",
    read: false,
    type: "approval",
  },
  {
    id: "notif-02",
    role: "provider",
    title: "New Incoming Request",
    message: "Aarav Mehta submitted a rider for 'Monsoon Rhythms' on Dec 18.",
    timestamp: "5 hours ago",
    read: false,
    type: "request",
  },
  {
    id: "notif-03",
    role: "audience",
    title: "Booking Confirmed",
    message: "Pass STG-8821 for Sitar & Cello Dialogue is confirmed.",
    timestamp: "1 day ago",
    read: false,
    type: "booking",
  },
  {
    id: "notif-04",
    role: "organiser",
    title: "Cause Milestone Reached",
    message: "Riverbank Classrooms campaign crossed 75% funding goal.",
    timestamp: "1 day ago",
    read: false,
    type: "cause",
  },
];

// Pre-seeded Demo Personas
export const DEMO_PERSONAS: Record<string, User> = {
  performer: {
    id: "usr-aarav",
    name: "Aarav Mehta",
    email: "aarav@stage.live",
    role: "performer",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
    bio: "Classical Indian sitarist pairing ragas with baroque French cello.",
    createdAt: "2026-11-01",
  },
  provider: {
    id: "usr-heritage",
    name: "Priya Sanghavi",
    email: "priya@heritagestages.live",
    role: "provider",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
    bio: "Curator of heritage brick lofts and community spaces.",
    createdAt: "2026-11-01",
  },
  audience: {
    id: "usr-rhea",
    name: "Rhea Sen",
    email: "rhea.sen@example.com",
    role: "audience",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80",
    bio: "Independent art patron and supporter of youth music programs.",
    createdAt: "2026-11-01",
  },
  organiser: {
    id: "usr-delta",
    name: "Delta Melody Foundation",
    email: "organizer@deltamelody.org",
    role: "organiser",
    avatarUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=160&auto=format&fit=crop&q=80",
    bio: "Grassroots cultural non-profit mobilizing instruments for rural schools.",
    createdAt: "2026-11-01",
  },
  admin: {
    id: "usr-admin",
    name: "STAGE Admin & Demo Lead",
    email: "admin@stage.live",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80",
    bio: "Platform administrator with multi-role demonstration access.",
    createdAt: "2026-11-01",
  },
};

interface StageStoreContextType {
  // Authentication & Persona
  currentUser: User | null;
  token: string | null;
  isAuthLoaded: boolean;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  login: (email: string, password?: string, demoRole?: string) => Promise<User>;
  demoLogin: (role: RoleType | "admin") => Promise<User>;
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
  }) => Promise<User>;
  logout: () => void;
  isMultiRole: boolean;

  // Role Navigation
  role: RoleType;
  setRole: (role: RoleType) => void;
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  clearError: () => void;
  refreshData: () => Promise<void>;

  // Settings & Reminders
  userSettings: import("@/types").UserSettings | null;
  updateUserSettings: (newSettings: Partial<import("@/types").UserSettings>) => Promise<void>;
  reminders: import("@/types").ReminderItem[];
  refreshReminders: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Data Store
  requests: PerformanceRequest[];
  venues: StageVenue[];
  events: PerformanceEvent[];
  bookings: AudienceBooking[];
  savedEventIds: string[];
  causes: SocialCause[];
  notifications: PlatformNotification[];
  ledger: LedgerEntry[];

  // Request Lifecycle Actions
  createPerformanceRequest: (
    req: Omit<PerformanceRequest, "id" | "status" | "createdAt">
  ) => Promise<void>;
  updateRequest: (
    id: string,
    updates: Partial<PerformanceRequest>
  ) => Promise<PerformanceRequest>;
  withdrawRequest: (id: string) => Promise<PerformanceRequest>;
  resubmitRequest: (id: string) => Promise<PerformanceRequest>;
  updateRequestStatus: (
    id: string,
    status: "approved" | "rejected" | "returned" | "pending" | "withdrawn",
    note?: string
  ) => Promise<void>;

  // Other Actions
  addVenue: (
    venue: Omit<StageVenue, "id" | "isDemonstration">
  ) => Promise<void>;
  bookEvent: (
    eventId: string,
    ticketCount: number,
    attendeeName: string,
    attendeeEmail: string
  ) => Promise<AudienceBooking>;
  toggleSaveEvent: (eventId: string) => void;
  createCampaign: (
    campaign: Omit<
      SocialCause,
      "id" | "currentAmount" | "linkedPerformancesCount" | "isDemonstration"
    >
  ) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
}

const StageStoreContext = createContext<StageStoreContextType | undefined>(
  undefined
);

export function StageStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState<boolean>(false);
  const [demoMode, setDemoModeState] = useState<boolean>(false);

  const [role, setRoleState] = useState<RoleType>("performer");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] =
    useState<PerformanceRequest[]>(INITIAL_REQUESTS);
  const [venues, setVenues] = useState<StageVenue[]>(MOCK_VENUES);
  const [events, setEvents] = useState<PerformanceEvent[]>(MOCK_PERFORMANCES);
  const [bookings, setBookings] = useState<AudienceBooking[]>(INITIAL_BOOKINGS);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([
    "evt-01",
    "evt-02",
  ]);
  const [causes, setCauses] = useState<SocialCause[]>(MOCK_CAUSES);
  const [notifications, setNotifications] =
    useState<PlatformNotification[]>(INITIAL_NOTIFICATIONS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(INITIAL_LEDGER);

  // Settings & Reminders state
  const [userSettings, setUserSettings] = useState<import("@/types").UserSettings | null>(null);
  const [reminders, setReminders] = useState<import("@/types").ReminderItem[]>([]);

  const clearError = () => setError(null);

  const isMultiRole = currentUser?.role === "admin" || demoMode;

  const setDemoMode = (enabled: boolean) => {
    setDemoModeState(enabled);
    try {
      localStorage.setItem("stage_demo_mode", enabled ? "true" : "false");
    } catch {
      // Ignore
    }
  };

  const refreshReminders = useCallback(async () => {
    try {
      const res = await api.getReminders();
      if (res && res.reminders) {
        setReminders(res.reminders);
      }
    } catch {
      // Ignore
    }
  }, []);

  const updateUserSettings = async (newSettings: Partial<import("@/types").UserSettings>) => {
    try {
      const updated = await api.updateUserSettings(newSettings);
      setUserSettings(updated);
    } catch (err) {
      console.warn("Failed to persist user settings to backend:", err);
      setUserSettings((prev) => (prev ? { ...prev, ...newSettings } : null));
    }
  };

  // Synchronize dynamic theme (light, dark, system) with document root and localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const themeToApply = userSettings?.theme || localStorage.getItem("stage_theme") || "system";

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
      }
    };

    if (themeToApply === "dark") {
      applyTheme(true);
      localStorage.setItem("stage_theme", "dark");
    } else if (themeToApply === "light") {
      applyTheme(false);
      localStorage.setItem("stage_theme", "light");
    } else {
      localStorage.setItem("stage_theme", "system");
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [userSettings?.theme]);

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead(role);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  // Sync state from Backend API (with fallback)
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        venuesData,
        eventsData,
        requestsData,
        causesData,
        bookingsData,
        ledgerData,
        notifsData,
      ] = await Promise.all([
        api.getVenues(),
        api.getEvents(),
        api.getRequests(),
        api.getCauses(),
        api.getBookings(),
        api.getContributions(),
        api.getNotifications(),
      ]);

      if (venuesData && venuesData.length > 0) setVenues(venuesData);
      if (eventsData && eventsData.length > 0) setEvents(eventsData);
      if (requestsData && requestsData.length > 0) setRequests(requestsData);
      if (causesData && causesData.length > 0) setCauses(causesData);
      if (bookingsData && bookingsData.length > 0) setBookings(bookingsData);
      if (ledgerData && ledgerData.length > 0) setLedger(ledgerData);
      if (notifsData && notifsData.length > 0) setNotifications(notifsData);
      setIsOnline(true);
      setError(null);

      if (typeof window !== "undefined" && localStorage.getItem("stage_auth_token")) {
        api.getUserSettings().then((s) => setUserSettings(s)).catch(() => {});
        api.getReminders().then((r) => r && setReminders(r.reminders)).catch(() => {});
      }
    } catch (err: unknown) {
      setIsOnline(false);
      const msg = err instanceof Error ? err.message : "Backend offline";
      console.warn("STAGE API fallback active:", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize UI role & saved preferences from localStorage + fetch from API
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("stage_auth_token");
      const storedUser = localStorage.getItem("stage_current_user");
      const storedDemoMode = localStorage.getItem("stage_demo_mode");

      if (storedDemoMode === "true") {
        setDemoModeState(true);
      }

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        setCurrentUser(parsedUser);
        setToken(storedToken);
        if (parsedUser.role !== "admin") {
          setRoleState(parsedUser.role as RoleType);
        }
      } else {
        setCurrentUser(null);
        setToken(null);
      }

      const storedSaved = localStorage.getItem("stage_demo_saved_events");
      if (storedSaved) {
        setSavedEventIds(JSON.parse(storedSaved));
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsAuthLoaded(true);
      refreshData();
    }
  }, [refreshData]);

  // Persist UI preferences in localStorage
  const setRole = (newRole: RoleType) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("stage_demo_role", newRole);
    } catch {
      // Ignore
    }
  };

  const toggleSaveEvent = (eventId: string) => {
    setSavedEventIds((prev) => {
      const updated = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      try {
        localStorage.setItem(
          "stage_demo_saved_events",
          JSON.stringify(updated)
        );
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  // Auth: Login
  const login = async (email: string, password?: string, demoRole?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password, demoRole });
      setCurrentUser(res.user);
      setToken(res.token);
      if (res.user.role !== "admin") {
        setRoleState(res.user.role as RoleType);
      }
      try {
        localStorage.setItem("stage_auth_token", res.token);
        localStorage.setItem("stage_current_user", JSON.stringify(res.user));
      } catch {
        // Ignore
      }
      return res.user;
    } catch (err: any) {
      // Fallback matching demo personas
      const matched = Object.values(DEMO_PERSONAS).find(
        (p) => p.email.toLowerCase() === email.toLowerCase() || p.role === demoRole
      );
      if (matched) {
        setCurrentUser(matched);
        setToken(`mock-tok-${Date.now()}`);
        if (matched.role !== "admin") {
          setRoleState(matched.role as RoleType);
        }
        localStorage.setItem("stage_current_user", JSON.stringify(matched));
        return matched;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Auth: Demo Login
  const demoLogin = async (targetRole: RoleType | "admin"): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin({ role: targetRole });
      setCurrentUser(res.user);
      setToken(res.token);
      if (targetRole !== "admin") {
        setRoleState(targetRole as RoleType);
      }
      try {
        localStorage.setItem("stage_auth_token", res.token);
        localStorage.setItem("stage_current_user", JSON.stringify(res.user));
      } catch {
        // Ignore
      }
      return res.user;
    } catch (err: any) {
      console.warn("Using offline demo persona fallback for", targetRole);
      const persona = DEMO_PERSONAS[targetRole] || DEMO_PERSONAS.performer;
      setCurrentUser(persona);
      setToken(`mock-tok-${Date.now()}`);
      if (targetRole !== "admin") {
        setRoleState(targetRole as RoleType);
      }
      localStorage.setItem("stage_current_user", JSON.stringify(persona));
      return persona;
    } finally {
      setIsLoading(false);
    }
  };

  // Auth: Register
  const register = async (payload: {
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
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setCurrentUser(res.user);
      setToken(res.token);
      if (payload.role !== "admin") {
        setRoleState(payload.role as RoleType);
      }
      try {
        localStorage.setItem("stage_auth_token", res.token);
        localStorage.setItem("stage_current_user", JSON.stringify(res.user));
      } catch {
        // Ignore
      }
      return res.user;
    } catch (err: any) {
      // Offline fallback
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        avatarUrl: payload.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80",
        bio: payload.bio || `Active ${payload.role} on STAGE.`,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setCurrentUser(newUser);
      setToken(`mock-tok-${Date.now()}`);
      if (payload.role !== "admin") {
        setRoleState(payload.role as RoleType);
      }
      localStorage.setItem("stage_current_user", JSON.stringify(newUser));
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  // Auth: Logout
  const logout = () => {
    try {
      api.logout().catch(() => {});
      localStorage.removeItem("stage_auth_token");
      localStorage.removeItem("stage_current_user");
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setToken(null);
    setDemoModeState(false);
  };

  // 1. Create Performance Request via API
  const createPerformanceRequest = async (
    req: Omit<PerformanceRequest, "id" | "status" | "createdAt">
  ) => {
    try {
      const created = await api.createRequest(req);
      setRequests((prev) => [created, ...prev]);

      const newNotif: PlatformNotification = {
        id: `notif-${Date.now()}`,
        role: "provider",
        title: "New Incoming Performance Pitch",
        message: `${req.performerName} submitted a request for '${req.title}'.`,
        timestamp: "Just now",
        read: false,
        type: "request",
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } catch (err: unknown) {
      console.warn("Falling back to local create request:", err);
      const fallbackReq: PerformanceRequest = {
        ...req,
        id: `req-${Date.now()}`,
        status: "pending",
        createdAt: new Date().toISOString().split("T")[0],
        statusHistory: [
          {
            timestamp: new Date().toISOString(),
            action: "created",
            toStatus: "pending",
            actorRole: "performer",
            actorName: req.performerName,
            note: "Pitch submitted locally.",
          },
        ],
      };
      setRequests((prev) => [fallbackReq, ...prev]);
    }
  };

  // 2. Edit / Update Request
  const updateRequest = async (
    id: string,
    updates: Partial<PerformanceRequest>
  ): Promise<PerformanceRequest> => {
    try {
      const updated = await api.updateRequest(id, updates);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err: unknown) {
      console.warn("Falling back to local update request:", err);
      let updatedObj: PerformanceRequest | null = null;
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const isMaterial =
              (updates.date && updates.date !== r.date) ||
              (updates.venueId && updates.venueId !== r.venueId) ||
              (updates.budget && updates.budget !== r.budget) ||
              (updates.title && updates.title !== r.title);

            const newStatus = r.status === "approved" && isMaterial ? "pending" : r.status;
            const newNote =
              r.status === "approved" && isMaterial
                ? "Material terms altered. Re-review required by venue host."
                : r.reviewNote;

            updatedObj = {
              ...r,
              ...updates,
              status: newStatus,
              reviewNote: newNote,
              updatedAt: new Date().toISOString(),
              statusHistory: [
                ...(r.statusHistory || []),
                {
                  timestamp: new Date().toISOString(),
                  action: isMaterial ? "material_update_reverted" : "edited",
                  fromStatus: r.status,
                  toStatus: newStatus,
                  actorRole: "performer",
                  actorName: r.performerName,
                  note: isMaterial
                    ? "Material terms altered; status reverted to pending review."
                    : "Pitch details updated by performer.",
                },
              ],
            };
            return updatedObj;
          }
          return r;
        })
      );
      return updatedObj || (requests.find((r) => r.id === id) as PerformanceRequest);
    }
  };

  // 3. Withdraw Request
  const withdrawRequest = async (id: string): Promise<PerformanceRequest> => {
    try {
      const updated = await api.withdrawRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err: unknown) {
      console.warn("Falling back to local withdraw request:", err);
      let updatedObj: PerformanceRequest | null = null;
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            updatedObj = {
              ...r,
              status: "withdrawn",
              reviewNote: "Withdrawn by performer.",
              updatedAt: new Date().toISOString(),
              statusHistory: [
                ...(r.statusHistory || []),
                {
                  timestamp: new Date().toISOString(),
                  action: "withdrawn",
                  fromStatus: r.status,
                  toStatus: "withdrawn",
                  actorRole: "performer",
                  actorName: r.performerName,
                  note: "Pitch formally withdrawn by performer.",
                },
              ],
            };
            return updatedObj;
          }
          return r;
        })
      );
      return updatedObj || (requests.find((r) => r.id === id) as PerformanceRequest);
    }
  };

  // 4. Resubmit Request
  const resubmitRequest = async (id: string): Promise<PerformanceRequest> => {
    try {
      const updated = await api.resubmitRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err: unknown) {
      console.warn("Falling back to local resubmit request:", err);
      let updatedObj: PerformanceRequest | null = null;
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            updatedObj = {
              ...r,
              status: "pending",
              reviewNote: "Pitch resubmitted with requested changes. Pending review.",
              updatedAt: new Date().toISOString(),
              statusHistory: [
                ...(r.statusHistory || []),
                {
                  timestamp: new Date().toISOString(),
                  action: "resubmitted",
                  fromStatus: "returned",
                  toStatus: "pending",
                  actorRole: "performer",
                  actorName: r.performerName,
                  note: "Performer addressed feedback and resubmitted pitch for approval.",
                },
              ],
            };
            return updatedObj;
          }
          return r;
        })
      );
      return updatedObj || (requests.find((r) => r.id === id) as PerformanceRequest);
    }
  };

  // 5. Update Request Status via API
  const updateRequestStatus = async (
    id: string,
    status: "approved" | "rejected" | "returned" | "pending" | "withdrawn",
    note?: string
  ) => {
    try {
      const updated = await api.updateRequestStatus(id, status, note);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));

      // Add notification for Performer
      const targetReq = requests.find((r) => r.id === id);
      const newNotif: PlatformNotification = {
        id: `notif-${Date.now()}`,
        role: "performer",
        title:
          status === "approved"
            ? "Stage Request Approved!"
            : status === "returned"
            ? "Pitch Changes Requested"
            : "Stage Request Update",
        message:
          status === "returned"
            ? `${targetReq?.venueName || "Venue host"} requested changes for '${targetReq?.title}': ${note || "Review requested adjustments."}`
            : `${targetReq?.venueName || "Venue host"} marked '${targetReq?.title || "Request"}' as ${status}.`,
        timestamp: "Just now",
        read: false,
        type: status === "returned" ? "request" : "approval",
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } catch (err: unknown) {
      console.warn("Falling back to local status update:", err);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                reviewNote:
                  note ||
                  (status === "approved"
                    ? "Approved by venue host. Technical rider cleared."
                    : status === "returned"
                    ? "Host requested changes to scheduling or technical rider before approval."
                    : "Declined by host."),
                updatedAt: new Date().toISOString(),
                statusHistory: [
                  ...(r.statusHistory || []),
                  {
                    timestamp: new Date().toISOString(),
                    action: `status_${status}`,
                    fromStatus: r.status,
                    toStatus: status,
                    actorRole: "provider",
                    actorName: r.venueName || "Venue Host",
                    note: note || `Status updated to ${status}.`,
                  },
                ],
              }
            : r
        )
      );
    }
  };

  // 6. Add Venue via API
  const addVenue = async (
    venueData: Omit<StageVenue, "id" | "isDemonstration">
  ) => {
    try {
      const created = await api.createVenue(venueData);
      setVenues((prev) => [created, ...prev]);

      const newNotif: PlatformNotification = {
        id: `notif-${Date.now()}`,
        role: "provider",
        title: "Venue Listed Successfully",
        message: `'${created.name}' is now active for performer discovery.`,
        timestamp: "Just now",
        read: false,
        type: "system",
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } catch (err: unknown) {
      console.warn("Falling back to local add venue:", err);
      const fallbackVenue: StageVenue = {
        ...venueData,
        id: `venue-${Date.now()}`,
        isDemonstration: true,
      };
      setVenues((prev) => [fallbackVenue, ...prev]);
    }
  };

  // 7. Book Event via API
  const bookEvent = async (
    eventId: string,
    ticketCount: number,
    attendeeName: string,
    attendeeEmail: string
  ): Promise<AudienceBooking> => {
    try {
      const booking = await api.createBooking({
        eventId,
        ticketCount,
        attendeeName,
        attendeeEmail,
      });

      setBookings((prev) => [booking, ...prev]);

      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === eventId) {
            const newAvail = Math.max(0, e.seats.available - ticketCount);
            return {
              ...e,
              seats: {
                ...e.seats,
                available: newAvail,
                status:
                  newAvail <= 5
                    ? "limited"
                    : newAvail === 0
                    ? "sold_out"
                    : e.seats.status,
              },
            };
          }
          return e;
        })
      );

      if (booking.causeContributionAmount && booking.causeContributionAmount > 0) {
        setCauses((prev) =>
          prev.map((c) =>
            c.title === booking.linkedCauseName
              ? {
                  ...c,
                  currentAmount:
                    c.currentAmount + (booking.causeContributionAmount || 0),
                }
              : c
          )
        );
      }

      return booking;
    } catch (err: unknown) {
      console.warn("Falling back to local booking:", err);
      const event = events.find((e) => e.id === eventId) || events[0];
      const match = event.seats.priceLabel.match(/\d[\d,]*/);
      const ticketPrice = match
        ? parseInt(match[0].replace(/,/g, ""), 10)
        : 450;
      const totalPaid = ticketPrice * ticketCount;
      const causeContrib = event.linkedCause
        ? Math.round(
            totalPaid * (event.linkedCause.percentageContribution / 100)
          )
        : 0;

      const fallbackBooking: AudienceBooking = {
        id: `book-${Date.now()}`,
        bookingCode: `STG-${Math.floor(1000 + Math.random() * 9000)}-${event.location.city.slice(0, 3).toUpperCase()}`,
        eventId: event.id,
        eventTitle: event.title,
        eventArtForm: event.artForm,
        eventDate: event.date,
        eventTime: event.time,
        venueName: event.location.venueName,
        city: event.location.city,
        ticketCount,
        totalPaid,
        currency: "₹",
        attendeeName,
        attendeeEmail,
        linkedCauseName: event.linkedCause?.name,
        causeContributionAmount: causeContrib,
        bookedAt: new Date().toISOString(),
        qrCodePlaceholder: `STG-PASS-${Date.now()}`,
        status: "confirmed",
      };

      setBookings((prev) => [fallbackBooking, ...prev]);
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === event.id) {
            const newAvail = Math.max(0, e.seats.available - ticketCount);
            return {
              ...e,
              seats: {
                ...e.seats,
                available: newAvail,
                status:
                  newAvail <= 5
                    ? "limited"
                    : newAvail === 0
                    ? "sold_out"
                    : e.seats.status,
              },
            };
          }
          return e;
        })
      );

      return fallbackBooking;
    }
  };

  // 8. Create Campaign via API
  const createCampaign = async (
    campaignData: Omit<
      SocialCause,
      "id" | "currentAmount" | "linkedPerformancesCount" | "isDemonstration"
    >
  ) => {
    try {
      const created = await api.createCause(campaignData);
      setCauses((prev) => [created, ...prev]);
    } catch (err: unknown) {
      console.warn("Falling back to local create cause:", err);
      const fallbackCause: SocialCause = {
        ...campaignData,
        id: `cause-${Date.now()}`,
        currentAmount: 0,
        linkedPerformancesCount: 0,
        isDemonstration: true,
      };
      setCauses((prev) => [fallbackCause, ...prev]);
    }
  };

  const markNotificationAsRead = markNotificationRead;

  return (
    <StageStoreContext.Provider
      value={{
        currentUser,
        token,
        isAuthLoaded,
        demoMode,
        setDemoMode,
        login,
        demoLogin,
        register,
        logout,
        isMultiRole,
        role,
        setRole,
        isLoading,
        isOnline,
        error,
        clearError,
        refreshData,
        requests,
        venues,
        events,
        bookings,
        savedEventIds,
        causes,
        notifications,
        ledger,
        createPerformanceRequest,
        updateRequest,
        withdrawRequest,
        resubmitRequest,
        updateRequestStatus,
        addVenue,
        bookEvent,
        toggleSaveEvent,
        createCampaign,
        markNotificationRead,
        markNotificationAsRead,
        markAllNotificationsRead,
        userSettings,
        updateUserSettings,
        reminders,
        refreshReminders,
      }}
    >
      {children}
    </StageStoreContext.Provider>
  );
}

export function useStageStore() {
  const context = useContext(StageStoreContext);
  if (!context) {
    throw new Error("useStageStore must be used within a StageStoreProvider");
  }
  return context;
}

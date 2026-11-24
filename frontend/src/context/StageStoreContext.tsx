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
    reviewNote:
      "Approved. Sound technician assigned for natural stone acoustic balance.",
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
    reviewNote: "Approved. Sprung floor reserved and lighting tech allocated.",
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
    reviewNote:
      "Declined: Exceeds acoustic listening room decibel and capacity thresholds.",
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

interface StageStoreContextType {
  role: RoleType;
  setRole: (role: RoleType) => void;
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  clearError: () => void;
  refreshData: () => Promise<void>;
  requests: PerformanceRequest[];
  venues: StageVenue[];
  events: PerformanceEvent[];
  bookings: AudienceBooking[];
  savedEventIds: string[];
  causes: SocialCause[];
  notifications: PlatformNotification[];
  ledger: LedgerEntry[];
  createPerformanceRequest: (
    req: Omit<PerformanceRequest, "id" | "status" | "createdAt">
  ) => Promise<void>;
  updateRequestStatus: (
    id: string,
    status: "approved" | "rejected",
    note?: string
  ) => Promise<void>;
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

  const clearError = () => setError(null);

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

      setVenues(venuesData);
      setEvents(eventsData);
      setRequests(requestsData);
      setCauses(causesData);
      setBookings(bookingsData);
      setLedger(ledgerData);
      setNotifications(notifsData);
      setIsOnline(true);
      setError(null);
    } catch (err: unknown) {
      // Backend not yet reachable or offline -> graceful local fallback
      setIsOnline(false);
      const msg = err instanceof Error ? err.message : "Backend offline";
      // We don't spam an error alert if it's simply connecting to offline fallback
      console.warn("STAGE API fallback active:", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize UI role & saved preferences from localStorage + fetch from API
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const storedRole = localStorage.getItem("stage_demo_role") as RoleType;
        if (
          storedRole &&
          ["performer", "provider", "audience", "organiser"].includes(storedRole)
        ) {
          setRoleState(storedRole);
        }

        const storedSaved = localStorage.getItem("stage_demo_saved_events");
        if (storedSaved) {
          setSavedEventIds(JSON.parse(storedSaved));
        }
      } catch {
        // Ignore
      }

      // Connect to Backend API
      refreshData();
    });
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

  // 1. Create Performance Request via API
  const createPerformanceRequest = async (
    req: Omit<PerformanceRequest, "id" | "status" | "createdAt">
  ) => {
    try {
      const created = await api.createRequest(req);
      setRequests((prev) => [created, ...prev]);

      // Push simulated notification for Stage Provider
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
      // Fallback
      const fallbackReq: PerformanceRequest = {
        ...req,
        id: `req-${Date.now()}`,
        status: "pending",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setRequests((prev) => [fallbackReq, ...prev]);
    }
  };

  // 2. Update Request Status via API
  const updateRequestStatus = async (
    id: string,
    status: "approved" | "rejected",
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
            : "Stage Request Update",
        message: `${targetReq?.venueName || "Venue host"} marked '${targetReq?.title || "Request"}' as ${status}.`,
        timestamp: "Just now",
        read: false,
        type: "approval",
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
                    : "Declined by host."),
              }
            : r
        )
      );
    }
  };

  // 3. Add Venue via API
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

  // 4. Book Event via API
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

      // Decrement available seats locally
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

      // Re-sync causes and contributions to reflect the new allocation
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

  // 5. Create Campaign via API
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

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <StageStoreContext.Provider
      value={{
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
        updateRequestStatus,
        addVenue,
        bookEvent,
        toggleSaveEvent,
        createCampaign,
        markNotificationAsRead,
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

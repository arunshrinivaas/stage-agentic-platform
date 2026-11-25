"use client";

import React, { useState } from "react";
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CalendarIcon,
  DownloadIcon,
  TicketIcon,
  HeartIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ClockIcon,
  MapPinIcon,
  XIcon,
  CheckIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";
import { PerformanceEvent } from "@/types";
import { api } from "@/services/api";

interface AudienceAiConciergeProps {
  onPassBookedSuccess?: (bookingCode: string, title: string) => void;
}

export function AudienceAiConcierge({ onPassBookedSuccess }: AudienceAiConciergeProps) {
  const { events, bookings, bookEvent, causes } = useStageStore();
  const [activeTab, setActiveTab] = useState<"recommendations" | "calendar" | "causes">("recommendations");

  // Booking Confirmation Modal
  const [confirmModalEvent, setConfirmModalEvent] = useState<PerformanceEvent | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Download single event calendar helper
  const handleDownloadSingleIcs = (event: PerformanceEvent) => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//STAGE//National Cultural Network//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:stage-event-${event.id}@stage.live`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${event.date.replace(/-/g, "")}T190000Z`,
      `DTEND:${event.date.replace(/-/g, "")}T210000Z`,
      `SUMMARY:${event.title} - ${event.performer.name}`,
      `LOCATION:${event.location.venueName}, ${event.location.city}`,
      `DESCRIPTION:${event.description.replace(/\n/g, " ")} | Verified via STAGE`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `STAGE-${event.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenBookingModal = (event: PerformanceEvent) => {
    // Check if already booked
    const alreadyBooked = bookings.some((b) => b.eventId === event.id);
    if (alreadyBooked) {
      setBookingError(`You already hold an active pass for '${event.title}'. Duplicate booking prevented.`);
      return;
    }
    setBookingError(null);
    setConfirmModalEvent(event);
  };

  const handleConfirmBooking = async () => {
    if (!confirmModalEvent) return;
    setIsBooking(true);
    setBookingError(null);

    try {
      const res = await bookEvent(
        confirmModalEvent.id,
        seatCount,
        "Rhea Sen",
        "rhea.sen@example.com"
      );
      onPassBookedSuccess?.(res.bookingCode, confirmModalEvent.title);
      setConfirmModalEvent(null);
    } catch (err: any) {
      setBookingError(err.message || "Failed to confirm reservation.");
    } finally {
      setIsBooking(false);
    }
  };

  // Curated rationale items
  const recommendations = events.slice(0, 2).map((evt, idx) => ({
    event: evt,
    matchReason:
      idx === 0
        ? "Curated based on your affinity for acoustic chamber strings and intimate courtyard acoustics. Features raga improvisation by Aarav Mehta."
        : "Matches your interest in contemporary Indian theatre and waterfront heritage settings with zero amplified distortion.",
    alreadyBooked: bookings.some((b) => b.eventId === evt.id),
  }));

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F2EC] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center shrink-0">
            <SparklesIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-xl font-medium text-[#191817]">
                AI Cultural Discovery & Pass Assistant
              </h2>
              <Badge variant="terracotta" size="sm">
                Personalized Curator
              </Badge>
            </div>
            <p className="text-xs text-[#6B665E]">
              Intelligent taste-matched events, duplicate-protected bookings, direct iCalendar exports, and linked causes.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-[#F4F2EC] rounded-xl text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab("recommendations")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "recommendations" ? "bg-white text-[#191817] shadow-2xs font-semibold" : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Recommended ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "calendar" ? "bg-white text-[#191817] shadow-2xs font-semibold" : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Calendar Sync ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("causes")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "causes" ? "bg-white text-[#191817] shadow-2xs font-semibold" : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Linked Causes ({causes.length})
          </button>
        </div>
      </div>

      {bookingError && (
        <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircleIcon size={16} />
            <span>{bookingError}</span>
          </div>
          <button onClick={() => setBookingError(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab 1: Recommendations */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map(({ event, matchReason, alreadyBooked }) => (
              <div
                key={event.id}
                className="p-4 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] hover:border-[#C85A32]/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#191817]">{event.title}</span>
                    <Badge variant="dark" size="sm">
                      {event.artForm}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6B665E]">
                    <MapPinIcon size={13} />
                    <span>{event.location.venueName}, {event.location.city}</span>
                    <span>·</span>
                    <CalendarIcon size={13} />
                    <span>{event.date}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E5DC] text-[11px] text-[#5A554D] leading-relaxed">
                    <strong className="text-[#C85A32] block mb-0.5">Why Curated for You:</strong>
                    {matchReason}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E5DC] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-[#191817]">{event.seats.priceLabel}</span>
                    <span className="text-[10px] text-[#8E897F] ml-1">
                      ({event.seats.available} seats left)
                    </span>
                  </div>

                  {alreadyBooked ? (
                    <span className="px-3 py-1.5 rounded-lg bg-[#EDF5ED] text-[#2D6638] text-xs font-semibold border border-[#CFE4CF] flex items-center gap-1">
                      <CheckCircleIcon size={13} />
                      <span>Pass Held</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenBookingModal(event)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors shadow-2xs"
                    >
                      <TicketIcon size={13} />
                      <span>Reserve Pass...</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Calendar (.ics) Exports */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] text-xs text-[#A66E2E] flex items-start gap-2.5">
            <ShieldCheckIcon size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong>Calendar Export & Synchronization Notice:</strong> Offline standard RFC 5545 <code>.ics</code> files can be imported directly into Apple Calendar, Google Calendar, and Microsoft Outlook. Background cloud push synchronization via Google or Microsoft Graph OAuth is not configured in this demonstration environment.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#FAFAF7] border border-[#E8E5DC]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#191817]">
                Master iCalendar Feed (.ics)
              </h3>
              <p className="text-xs text-[#6B665E] mt-0.5">
                Subscribable RFC 5545 feed compatible with Apple Calendar, Google Calendar, and Outlook.
              </p>
            </div>
            <a
              href={api.getCalendarExportUrl()}
              download="stage-passes.ics"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-semibold transition-colors shrink-0 shadow-2xs"
            >
              <DownloadIcon size={14} />
              <span>Export All Passes (.ics)</span>
            </a>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-[#8E897F]">
              Individual Confirmed Passes
            </span>
            {bookings.length === 0 ? (
              <p className="text-xs text-[#6B665E]">No confirmed passes found yet.</p>
            ) : (
              bookings.map((booking) => {
                const event = events.find((e) => e.id === booking.eventId);
                return (
                  <div
                    key={booking.id}
                    className="p-3.5 rounded-xl border border-[#E8E5DC] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#191817]">
                          {booking.eventTitle}
                        </span>
                        <code className="text-[10px] font-mono bg-[#F4F2EC] px-1.5 py-0.5 rounded text-[#6B665E]">
                          {booking.bookingCode}
                        </code>
                      </div>
                      <span className="text-xs text-[#6B665E] block mt-0.5">
                        {booking.eventDate} · {booking.venueName} · {booking.ticketCount} Pass(es)
                      </span>
                    </div>

                    <button
                      onClick={() => event && handleDownloadSingleIcs(event)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E5DC] text-[#191817] hover:bg-[#F4F2EC] text-xs font-medium transition-colors self-start sm:self-auto"
                    >
                      <DownloadIcon size={13} />
                      <span>Download .ics</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Linked Causes */}
      {activeTab === "causes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {causes.map((cause) => (
              <div
                key={cause.id}
                className="p-4 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="terracotta" size="sm">
                    {cause.focusArea}
                  </Badge>
                  <span className="text-[11px] font-mono text-[#2D6638] font-semibold">
                    30% Ticket Pledge
                  </span>
                </div>
                <h4 className="font-semibold text-xs text-[#191817]">{cause.title}</h4>
                <p className="text-[11px] text-[#5A554D] leading-relaxed line-clamp-2">
                  {cause.description}
                </p>
                <div className="pt-2 border-t border-[#E8E5DC] flex items-center justify-between text-[11px] text-[#8E897F]">
                  <span>{cause.linkedPerformancesCount} Linked Concerts</span>
                  <span className="text-[#191817] font-medium">
                    Funded: ₹{cause.currentAmount.toLocaleString()} (Simulated)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Confirmation Dialog */}
      {confirmModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191817]/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E5DC] shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F4F2EC] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center">
                  <TicketIcon size={18} />
                </div>
                <h3 className="font-editorial text-lg font-medium text-[#191817]">
                  Confirm Pass Reservation
                </h3>
              </div>
              <button
                onClick={() => setConfirmModalEvent(null)}
                className="p-1 rounded-lg text-[#6B665E] hover:text-[#191817]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="text-xs text-[#5A554D] space-y-3">
              <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E8E5DC] space-y-1 text-xs">
                <div className="font-semibold text-sm text-[#191817]">
                  {confirmModalEvent.title}
                </div>
                <div>Performer: {confirmModalEvent.performer.name}</div>
                <div>Venue: {confirmModalEvent.location.venueName}, {confirmModalEvent.location.city}</div>
                <div>Date & Time: {confirmModalEvent.date} · 7:00 PM</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-[#E8E5DC]">
                <span className="font-medium text-[#191817]">Pass Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                    className="w-7 h-7 rounded-lg border border-[#E8E5DC] bg-white flex items-center justify-center font-bold hover:bg-[#F4F2EC]"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-[#191817]">{seatCount}</span>
                  <button
                    onClick={() => setSeatCount(Math.min(4, seatCount + 1))}
                    className="w-7 h-7 rounded-lg border border-[#E8E5DC] bg-white flex items-center justify-center font-bold hover:bg-[#F4F2EC]"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] text-[11px] text-[#A66E2E] space-y-1">
                <div className="font-semibold flex items-center justify-between">
                  <span>Pass Rate:</span>
                  <span className="text-sm">{confirmModalEvent.seats.priceLabel} (x{seatCount})</span>
                </div>
                <div className="text-[10px] text-[#6B665E]">
                  Includes 30% direct grassroots cause contribution. Sandbox transaction: no real payment card charged.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F4F2EC]">
              <button
                onClick={() => setConfirmModalEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6B665E] hover:bg-[#F4F2EC]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={isBooking}
                className="px-5 py-2.5 rounded-xl bg-[#191817] hover:bg-[#C85A32] text-xs font-semibold text-white transition-colors flex items-center gap-2 shadow-2xs disabled:opacity-50"
              >
                {isBooking ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Securing Pass...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon size={14} />
                    <span>Confirm & Secure Pass</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

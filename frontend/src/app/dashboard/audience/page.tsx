"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  HeartIcon,
  HeartFilledIcon,
  SearchIcon,
  CheckCircleIcon,
  QrCodeIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { DigitalPassModal } from "@/components/dashboard/DigitalPassModal";
import { EventDetailsModal } from "@/components/dashboard/EventDetailsModal";
import { AudienceAiConcierge } from "@/components/dashboard/AudienceAiConcierge";
import { useStageStore } from "@/context/StageStoreContext";
import { AudienceBooking, PerformanceEvent } from "@/types";

export default function AudienceDashboardPage() {
  const { events, bookings, savedEventIds, toggleSaveEvent, bookEvent, causes } = useStageStore();
  const [activeTab, setActiveTab] = useState<"recommended" | "bookings" | "saved" | "history">("recommended");
  const [selectedPass, setSelectedPass] = useState<AudienceBooking | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<PerformanceEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const savedEvents = events.filter((e) => savedEventIds.includes(e.id));

  // Dynamic calculations based strictly on current verified bookings
  const totalPledged = bookings.reduce(
    (sum, b) => sum + (b.causeContributionAmount || 0),
    0
  );
  const distinctCausesSupported = new Set(
    bookings.map((b) => b.linkedCauseName).filter(Boolean)
  ).size;

  const filteredUpcoming = events.filter((evt) => {
    return (
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.performer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.artForm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleQuickBook = async (event: PerformanceEvent) => {
    if (event.seats.available <= 0) {
      setToastMessage(`Performance '${event.title}' is completely sold out!`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    try {
      const booking = await bookEvent(event.id, 1, "Rhea Sen", "rhea.sen@example.com");
      setToastMessage(`Reserved 1 pass for '${event.title}'! Booking reference: ${booking.bookingCode}`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      setToastMessage(`Booking notice: ${msg}`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-10">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-[#EDF5ED] border border-[#CFE4CF] text-[#2D6638] text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircleIcon size={16} />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Audience Welcome Card */}
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-2xl sm:text-3xl font-medium text-[#191817]">
                Welcome back, Rhea
              </h1>
              <Badge variant="terracotta" size="sm">
                Culture Member
              </Badge>
            </div>
            <p className="text-xs font-mono text-[#8E897F]">
              Passionate about classical acoustic fusion, indie spoken word, and waterfront lofts.
            </p>
            <p className="text-xs sm:text-sm text-[#5A554D] max-w-2xl leading-relaxed pt-1">
              Your ticket purchases have directly contributed to {distinctCausesSupported} grassroots social initiatives this season (simulated demonstration figures).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("bookings")}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-xs sm:text-sm transition-colors shadow-2xs"
            >
              <TicketIcon size={15} />
              <span>My Passes ({bookings.length})</span>
            </button>
          </div>
        </div>

        {/* Member Impact Numbers (Explicitly Identified as Simulated) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-[#F4F2EC]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("bookings");
              document.getElementById("audience-tabs")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View my booked passes"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] group-hover:text-[#191817] flex items-center justify-between">
              <span>Active Passes</span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817] mt-0.5">
              {bookings.length} Booked
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("saved");
              document.getElementById("audience-tabs")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View saved wishlist performances"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] group-hover:text-[#C85A32] flex items-center justify-between">
              <span>Saved Wishlist</span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#C85A32] mt-0.5">
              {savedEvents.length} Events
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setToastMessage(
                `Causes Supported: Your passes have directly supported ${distinctCausesSupported} verified cultural cause campaigns across heritage preservation and youth music.`
              )
            }
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Click to view supported causes breakdown"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center justify-between">
              <span>Causes Supported</span>
              <span className="text-[10px] text-[#2D6638] opacity-0 group-hover:opacity-100 transition-opacity">ℹ Info</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#2D6638] mt-0.5">
              {distinctCausesSupported} {distinctCausesSupported === 1 ? "Campaign" : "Campaigns"}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setToastMessage(
                `Total ₹${totalPledged.toLocaleString()} pledged to grassroots causes via verified pass bookings through STAGE deterministic ImpactFlow.`
              )
            }
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Click to view pledged contribution summary"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Impact Pledged</span>
                <span className="text-[9px] lowercase text-[#8E897F]">(simulated)</span>
              </span>
              <span className="text-[10px] text-[#8E897F] opacity-0 group-hover:opacity-100 transition-opacity">ℹ Info</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817] mt-0.5">
              ₹{totalPledged.toLocaleString()}
            </div>
          </button>
        </div>
      </div>

      {/* In-Workspace AI Capabilities: Personalized Recommendations, iCal Sync, Duplicate Prevention & Linked Causes */}
      <AudienceAiConcierge
        onPassBookedSuccess={(code, title) => {
          setToastMessage(`Reserved pass for '${title}'! Reference: ${code}`);
          setTimeout(() => setToastMessage(null), 5000);
        }}
      />

      {/* Navigation Filter Tabs */}
      <div id="audience-tabs" className="flex items-center gap-2 border-b border-[#E8E5DC] pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("recommended")}
          type="button"
          className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
            activeTab === "recommended"
              ? "bg-[#191817] text-white"
              : "bg-white text-[#6B665E] hover:text-[#191817] border border-[#E8E5DC]"
          }`}
        >
          Recommended & Upcoming ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          type="button"
          className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
            activeTab === "bookings"
              ? "bg-[#191817] text-white"
              : "bg-white text-[#6B665E] hover:text-[#191817] border border-[#E8E5DC]"
          }`}
        >
          My Passes ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          type="button"
          className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
            activeTab === "saved"
              ? "bg-[#191817] text-white"
              : "bg-white text-[#6B665E] hover:text-[#191817] border border-[#E8E5DC]"
          }`}
        >
          Saved Favorites ({savedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          type="button"
          className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
            activeTab === "history"
              ? "bg-[#191817] text-white"
              : "bg-white text-[#6B665E] hover:text-[#191817] border border-[#E8E5DC]"
          }`}
        >
          Impact & Attendance History
        </button>
      </div>

      {/* Tab 1: Recommended Performances */}
      {activeTab === "recommended" && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
                Recommended for You
              </h2>
              <p className="text-xs text-[#6B665E]">
                Handpicked based on your taste for chamber acoustics and intimate theatre.
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E897F]" />
              <input
                type="text"
                placeholder="Search gigs or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-full bg-white border border-[#E8E5DC] text-[#191817] placeholder-[#8E897F] focus:outline-none focus:border-[#C85A32]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUpcoming.map((event) => {
              const isSaved = savedEventIds.includes(event.id);
              const isSoldOut = event.seats.available <= 0;

              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEventModal(event)}
                  className="bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs hover:shadow-xs hover:border-[#C85A32]/60 transition-all flex flex-col justify-between cursor-pointer group"
                  title="Click to view full performance details & calendar options"
                >
                  <div>
                    <div className="relative aspect-[16/9] bg-[#191817]">
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <Badge variant="dark" size="sm">
                          {event.artForm}
                        </Badge>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveEvent(event.id);
                        }}
                        type="button"
                        className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 backdrop-blur-xs text-[#191817] hover:scale-110 transition-all shadow-xs"
                        aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
                      >
                        {isSaved ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
                      </button>

                      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white flex items-center justify-between text-xs">
                        <span>{event.date} · {event.time}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${isSoldOut ? "bg-red-600/80 text-white" : "bg-black/50"}`}>
                          {isSoldOut ? "Sold Out" : `${event.seats.available} seats left`}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="text-xs text-[#8E897F]">
                        {event.performer.name}
                      </div>
                      <h3 className="font-editorial text-lg font-medium text-[#191817] line-clamp-1">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#6B665E]">
                        <MapPinIcon size={12} className="text-[#C85A32]" />
                        <span>{event.location.venueName}, {event.location.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-[#F4F2EC] mt-2">
                    <div className="pt-3 flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-[#191817]">
                        {event.seats.priceLabel}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickBook(event);
                        }}
                        disabled={isSoldOut}
                        type="button"
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          isSoldOut
                            ? "bg-[#E8E5DC] text-[#8E897F] cursor-not-allowed"
                            : "bg-[#191817] text-white hover:bg-[#C85A32]"
                        }`}
                      >
                        <TicketIcon size={13} />
                        <span>{isSoldOut ? "Sold Out" : "Book Seat"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab 2: My Passes / Bookings */}
      {activeTab === "bookings" && (
        <section className="space-y-4">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Your Digital Passes
            </h2>
            <p className="text-xs text-[#6B665E]">
              Present these verified digital QR passes at venue doors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-[#E8E5DC] p-6 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#C85A32]">
                      {booking.bookingCode}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2D6638] bg-[#EDF5ED] px-2.5 py-0.5 rounded-full">
                      Confirmed
                    </span>
                  </div>

                  <h3 className="font-editorial text-xl font-medium text-[#191817]">
                    {booking.eventTitle}
                  </h3>

                  <div className="text-xs text-[#6B665E] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={13} className="text-[#C85A32]" />
                      <span>{booking.eventDate} · {booking.eventTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPinIcon size={13} className="text-[#C85A32]" />
                      <span>{booking.venueName}, {booking.city}</span>
                    </div>
                  </div>

                  {booking.linkedCauseName && (
                    <div className="p-2.5 bg-[#FBF0EB] rounded-xl text-xs text-[#C85A32] flex items-center gap-1.5">
                      <HeartIcon size={14} className="shrink-0" />
                      <span className="truncate">
                        Pledged ₹{booking.causeContributionAmount} to {booking.linkedCauseName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#F4F2EC] flex items-center justify-between">
                  <span className="text-xs text-[#8E897F]">
                    {booking.ticketCount} {booking.ticketCount === 1 ? "Pass" : "Passes"} · Paid ₹{booking.totalPaid} (Simulated)
                  </span>
                  <button
                    onClick={() => setSelectedPass(booking)}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors"
                  >
                    <QrCodeIcon size={14} />
                    <span>View Pass</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab 3: Saved Favorites */}
      {activeTab === "saved" && (
        <section className="space-y-4">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Saved Wishlist
            </h2>
            <p className="text-xs text-[#6B665E]">
              Performances you have bookmarked for upcoming weekends.
            </p>
          </div>

          {savedEvents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#D5D1C6] text-xs text-[#8E897F]">
              No saved events yet. Click the heart icon on any performance to save it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEventModal(event)}
                  className="bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs p-4 flex flex-col justify-between hover:border-[#C85A32]/60 hover:shadow-xs transition-all cursor-pointer group"
                  title="Click to view details & pass reservation"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" size="sm">
                        {event.artForm}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveEvent(event.id);
                        }}
                        className="text-[#C85A32] p-1 hover:scale-110 transition-transform"
                      >
                        <HeartFilledIcon size={16} />
                      </button>
                    </div>
                    <h4 className="font-editorial text-base font-medium text-[#191817]">
                      {event.title}
                    </h4>
                    <div className="text-xs text-[#6B665E]">
                      {event.performer.name} · {event.date}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#F4F2EC] flex items-center justify-between">
                    <span className="text-xs font-semibold">{event.seats.priceLabel}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBook(event);
                      }}
                      className="px-3 py-1 rounded-full bg-[#191817] text-white text-xs font-medium hover:bg-[#C85A32] transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 4: Impact & Attendance History */}
      {activeTab === "history" && (
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E5DC] shadow-2xs space-y-6">
          <div>
            <h2 className="font-editorial text-xl font-medium text-[#191817]">
              Participation & Social Impact History
            </h2>
            <p className="text-xs text-[#6B665E]">
              Every ticket on STAGE connects live art with verified grassroots community causes (simulated impact allocations).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {causes.slice(0, 2).map((cause) => {
              // Calculate dynamic pledge for this specific cause from bookings
              const causePledged = bookings
                .filter((b) => b.linkedCauseName === cause.title)
                .reduce((sum, b) => sum + (b.causeContributionAmount || 0), 0);

              return (
                <div
                  key={cause.id}
                  className="p-4 rounded-xl bg-[#F4F2EC]/50 border border-[#E8E5DC] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#191817]">
                      {cause.title}
                    </span>
                    <Badge variant="terracotta" size="sm">
                      Supported
                    </Badge>
                  </div>
                  <p className="text-[#5A554D] leading-relaxed">
                    {cause.tagline}
                  </p>
                  <div className="pt-1 text-[11px] text-[#2D6638] font-medium flex items-center gap-1">
                    <CheckCircleIcon size={12} />
                    <span>Your passes contributed ₹{causePledged.toLocaleString()} (Simulated) to this campaign pool.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Digital Pass Preview Modal */}
      <DigitalPassModal
        booking={selectedPass}
        onClose={() => setSelectedPass(null)}
      />

      {/* Event Details Modal */}
      {selectedEventModal && (
        <EventDetailsModal
          event={selectedEventModal}
          isOpen={true}
          onClose={() => setSelectedEventModal(null)}
          onReservePass={(evt) => handleQuickBook(evt)}
          isAlreadyBooked={bookings.some((b) => b.eventId === selectedEventModal.id)}
        />
      )}
    </div>
  );
}

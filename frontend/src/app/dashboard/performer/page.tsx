"use client";

import React, { useState } from "react";
import Image from "next/image";
import { VenueImage } from "@/components/ui/VenueImage";
import {
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BuildingIcon,
  ShieldCheckIcon,
  XIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { CreateRequestModal } from "@/components/dashboard/CreateRequestModal";
import { RequestDetailsModal } from "@/components/requests/RequestDetailsModal";
import { EditRequestModal } from "@/components/requests/EditRequestModal";
import { VenueDetailsModal } from "@/components/dashboard/VenueDetailsModal";
import { EventDetailsModal } from "@/components/dashboard/EventDetailsModal";
import { PerformerAiCopilot } from "@/components/dashboard/PerformerAiCopilot";
import { useStageStore } from "@/context/StageStoreContext";
import { PerformanceRequest, StageVenue, PerformanceEvent } from "@/types";

export default function PerformerDashboardPage() {
  const { requests, venues, events, withdrawRequest, resubmitRequest } = useStageStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preselectedVenueId, setPreselectedVenueId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Request Lifecycle Modals
  const [detailsModalReq, setDetailsModalReq] = useState<PerformanceRequest | null>(null);
  const [editModalReq, setEditModalReq] = useState<PerformanceRequest | null>(null);
  const [withdrawModalReq, setWithdrawModalReq] = useState<PerformanceRequest | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Functional Tile Modals
  const [selectedGigModal, setSelectedGigModal] = useState<PerformanceEvent | null>(null);
  const [selectedVenueModal, setSelectedVenueModal] = useState<StageVenue | null>(null);

  const performerRequests = requests.filter((r) => r.performerId === "perf-mehta");
  const upcomingGigs = events.filter((e) => e.performer.name.includes("Aarav Mehta"));

  // Dynamic deterministic calculations based on active confirmed ticket sales + baseline past gigs
  const dynamicTicketsSold = upcomingGigs.reduce(
    (sum, gig) => sum + (gig.seats.total - gig.seats.available),
    0
  );
  // Base historical earnings ₹1,20,700 + current box office share (85% of ₹450/seat)
  const simulatedEarnings = 120700 + Math.round(dynamicTicketsSold * 450 * 0.85);
  // Base historical pledge ₹21,300 + current cause pledges (30% of ₹450/seat)
  const simulatedPledged = 21300 + Math.round(dynamicTicketsSold * 450 * 0.3);

  const handleOpenPitch = (venueId?: string) => {
    setPreselectedVenueId(venueId);
    setIsModalOpen(true);
  };

  const handleToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const confirmWithdraw = async () => {
    if (!withdrawModalReq) return;
    setIsWithdrawing(true);
    try {
      await withdrawRequest(withdrawModalReq.id);
      handleToast(`Pitch '${withdrawModalReq.title}' has been withdrawn.`);
      setWithdrawModalReq(null);
    } catch (err: any) {
      handleToast("Failed to withdraw pitch.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleResubmit = async (req: PerformanceRequest) => {
    try {
      await resubmitRequest(req.id);
      handleToast(`Pitch '${req.title}' resubmitted to venue host for review.`);
    } catch (err: any) {
      handleToast("Failed to resubmit pitch.");
    }
  };

  const handleDuplicate = (req: PerformanceRequest) => {
    setPreselectedVenueId(req.venueId);
    setIsModalOpen(true);
    handleToast(`Pitch form pre-populated from '${req.title}'. Adjust terms and submit.`);
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

      {/* Performer Profile Card */}
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#191817] shrink-0 border border-[#D5D1C6]">
              <Image
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                alt="Aarav Mehta & Clara Dubois"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-editorial text-2xl sm:text-3xl font-medium text-[#191817]">
                  Aarav Mehta & Clara Dubois
                </h1>
                <Badge variant="status" size="sm">
                  <ShieldCheckIcon size={11} /> Verified Performer
                </Badge>
              </div>
              <p className="text-xs font-mono text-[#8E897F]">
                @mehta.dubois · Indo-Classical & Baroque Chamber Fusion
              </p>
              <p className="text-xs sm:text-sm text-[#5A554D] max-w-2xl leading-relaxed pt-1">
                Classical Indian sitar paired with baroque French cello, exploring cross-continental raga improvisations across natural stone acoustic venues.
              </p>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="shrink-0">
            <button
              onClick={() => handleOpenPitch()}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-xs sm:text-sm transition-colors shadow-2xs"
            >
              <PlusIcon size={16} />
              <span>Pitch New Stage</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-[#F4F2EC]">
          <button
            type="button"
            onClick={() => document.getElementById("upcoming-gigs")?.scrollIntoView({ behavior: "smooth" })}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View confirmed performances"
          >
            <div className="text-xs font-mono text-[#8E897F] mb-1 group-hover:text-[#191817] flex items-center justify-between">
              <span>Upcoming Gigs</span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817]">
              {upcomingGigs.length} Confirmed
            </div>
          </button>

          <button
            type="button"
            onClick={() => document.getElementById("stage-requests")?.scrollIntoView({ behavior: "smooth" })}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View stage pitches & approvals"
          >
            <div className="text-xs font-mono text-[#8E897F] mb-1 group-hover:text-[#191817] flex items-center justify-between">
              <span>Active Pitches</span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#C85A32]">
              {performerRequests.length} Pitches
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleToast(
                `Simulated Net: ₹1,20,700 historical + ₹${Math.round(
                  dynamicTicketsSold * 450 * 0.85
                ).toLocaleString()} from ${dynamicTicketsSold} active ticket reservations (85% box office share).`
              )
            }
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Click to view earnings calculation breakdown"
          >
            <div className="text-xs font-mono text-[#8E897F] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Simulated Net</span>
                <span className="text-[9px] lowercase text-[#8E897F]">(simulated)</span>
              </span>
              <span className="text-[10px] text-[#8E897F] opacity-0 group-hover:opacity-100 transition-opacity">ℹ Info</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817]">
              ₹{simulatedEarnings.toLocaleString()}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleToast(
                `Cause Impact: ₹21,300 historical + ₹${Math.round(
                  dynamicTicketsSold * 450 * 0.3
                ).toLocaleString()} pledged across confirmed ticket reservations (30% cause contribution).`
              )
            }
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Click to view cause pledges breakdown"
          >
            <div className="text-xs font-mono text-[#8E897F] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Cause Impact</span>
                <span className="text-[9px] lowercase text-[#8E897F]">(simulated)</span>
              </span>
              <span className="text-[10px] text-[#2D6638] opacity-0 group-hover:opacity-100 transition-opacity">ℹ Info</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#2D6638]">
              ₹{simulatedPledged.toLocaleString()}
            </div>
          </button>
        </div>
      </div>

      {/* In-Workspace AI Capabilities: Stage Matcher, Technical Rider Audit, Civic Guidance & Conflicts */}
      <PerformerAiCopilot onSelectVenueForPitch={handleOpenPitch} />

      {/* Section 1: Venue Requests & Lifecycle Management */}
      <section id="stage-requests" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Stage Requests & Approvals
            </h2>
            <p className="text-xs text-[#6B665E]">
              Track, alter, edit riders, withdraw, or resubmit performance pitches in real-time.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8E897F]">
            {performerRequests.length} Total Requests
          </span>
        </div>

        <div className="space-y-3">
          {performerRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white p-5 rounded-2xl border border-[#E8E5DC] shadow-2xs hover:border-[#D5D1C6] transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F4F2EC]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-[#191817]">
                      {req.title}
                    </span>
                    <Badge variant="default" size="sm">
                      {req.artForm}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#6B665E] mt-1">
                    <span className="flex items-center gap-1">
                      <BuildingIcon size={12} className="text-[#C85A32]" />
                      {req.venueName}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon size={12} />
                      {req.date} {req.time ? `· ${req.time}` : ""}
                    </span>
                    <span className="flex items-center gap-1 hidden md:flex">
                      <UsersIcon size={12} />
                      ~{req.expectedAudienceSize} audience
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[#2D6638] hidden lg:flex">
                      {req.currency} {req.budget.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0 flex items-center gap-2">
                  {req.status === "approved" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF]">
                      <CheckCircleIcon size={13} /> Approved by Host
                    </span>
                  )}
                  {req.status === "returned" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F0FF] text-[#6B21A8] border border-[#E9D5FF]">
                      <ClockIcon size={13} /> Changes Requested
                    </span>
                  )}
                  {req.status === "pending" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF4EB] text-[#A66E2E] border border-[#ECD9BA]">
                      <ClockIcon size={13} /> Pending Review
                    </span>
                  )}
                  {req.status === "rejected" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF0ED] text-[#C53030] border border-[#F8D2C9]">
                      <XCircleIcon size={13} /> Declined
                    </span>
                  )}
                  {req.status === "withdrawn" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F4F2EC] text-[#6B665E] border border-[#E8E5DC]">
                      <XIcon size={13} /> Withdrawn
                    </span>
                  )}
                </div>
              </div>

              {/* Rider Note / Host Feedback */}
              <div className="pt-3 text-xs text-[#5A554D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="line-clamp-1 italic text-xs">
                  &ldquo;{req.description}&rdquo;
                </p>

                {req.reviewNote && (
                  <span
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg shrink-0 ${
                      req.status === "returned"
                        ? "bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]"
                        : "bg-[#F4F2EC] text-[#191817]"
                    }`}
                  >
                    Host: {req.reviewNote}
                  </span>
                )}
              </div>

              {/* Action Buttons for Pitch Lifecycle */}
              <div className="pt-3 mt-3 border-t border-[#F4F2EC] flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-mono text-[#8E897F]">
                  {req.durationMinutes ? `${req.durationMinutes} min session` : "60 min session"} · {req.preferredLocation}
                </div>

                <div className="flex items-center gap-2">
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => setDetailsModalReq(req)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#191817] bg-[#F4F2EC] hover:bg-[#ECEAE1] transition-colors"
                  >
                    View Details & History
                  </button>

                  {/* Resubmit Pitch (if returned) */}
                  {req.status === "returned" && (
                    <button
                      type="button"
                      onClick={() => handleResubmit(req)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#6B21A8] hover:bg-[#7E22CE] shadow-2xs transition-colors"
                    >
                      Resubmit Pitch
                    </button>
                  )}

                  {/* Edit Pitch (if pending, returned, or approved) */}
                  {(req.status === "pending" || req.status === "returned" || req.status === "approved") && (
                    <button
                      type="button"
                      onClick={() => setEditModalReq(req)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#191817] border border-[#E8E5DC] hover:border-[#C85A32] bg-white transition-colors"
                    >
                      Edit Pitch
                    </button>
                  )}

                  {/* Withdraw Pitch (if pending or approved) */}
                  {(req.status === "pending" || req.status === "approved") && (
                    <button
                      type="button"
                      onClick={() => setWithdrawModalReq(req)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Withdraw
                    </button>
                  )}

                  {/* Duplicate as New Pitch (if rejected or withdrawn) */}
                  {(req.status === "rejected" || req.status === "withdrawn") && (
                    <button
                      type="button"
                      onClick={() => handleDuplicate(req)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#C85A32] border border-[#C85A32]/30 hover:bg-[#FBF0EB] transition-colors"
                    >
                      Duplicate Pitch →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Upcoming Confirmed Performances */}
      <section id="upcoming-gigs" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Upcoming Confirmed Gigs
            </h2>
            <p className="text-xs text-[#6B665E]">
              Confirmed stage dates with live ticket reservations.
            </p>
          </div>
          <Badge variant="status" size="sm">
            Live Season
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingGigs.map((gig) => (
            <div
              key={gig.id}
              onClick={() => setSelectedGigModal(gig)}
              className="bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs hover:border-[#C85A32]/60 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
              title="Click to view full performance details & calendar export"
            >
              <div>
                <div className="relative aspect-[16/8] bg-[#191817]">
                  <Image
                    src={gig.imageUrl}
                    alt={gig.title}
                    fill
                    className="object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <Badge variant="dark" size="sm">
                      {gig.subGenre}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between text-xs">
                    <span className="font-semibold">{gig.date} · {gig.time}</span>
                    <span className="bg-black/40 px-2 py-0.5 rounded-full text-[11px]">
                      Call time: 4:30 PM
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-editorial text-xl font-medium text-[#191817]">
                    {gig.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#6B665E]">
                    <MapPinIcon size={13} className="text-[#C85A32]" />
                    <span>{gig.location.venueName}, {gig.location.city}</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-baseline text-xs mb-1.5">
                      <span className="text-[#6B665E]">Tickets Reserved</span>
                      <span className="font-semibold text-[#191817]">
                        {gig.seats.total - gig.seats.available} of {gig.seats.total} Seats
                      </span>
                    </div>
                    <div className="w-full bg-[#F4F2EC] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#C85A32] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${((gig.seats.total - gig.seats.available) / gig.seats.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-[#F4F2EC] mt-2">
                <div className="pt-3 flex items-center justify-between text-xs text-[#8E897F]">
                  <span>Box Office: {gig.seats.priceLabel}</span>
                  <span className="text-[#2D6638] font-medium">30% to Youth Arts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Discover Available Stages */}
      <section id="available-stages" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Discover Available Stages
            </h2>
            <p className="text-xs text-[#6B665E]">
              Venues currently accepting performance requests and acoustic riders ({venues.length} spaces available).
            </p>
          </div>
          <Badge variant="status" size="sm">
            Venue Directory
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {venues.map((venue) => (
            <div
              key={venue.id}
              onClick={() => setSelectedVenueModal(venue)}
              className="bg-white p-4 rounded-2xl border border-[#E8E5DC] shadow-2xs hover:shadow-xs hover:border-[#C85A32]/60 transition-all flex flex-col justify-between cursor-pointer group"
              title="Click to view acoustic specifications & host policy"
            >
              <div>
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-[#191817]">
                  <VenueImage
                    src={venue.imageUrl}
                    alt={venue.name}
                    venueId={venue.id}
                    venueName={venue.name}
                    venueType={venue.venueType}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full">
                      {venue.capacity.formatted}
                    </span>
                  </div>
                </div>
                <h4 className="font-medium text-sm text-[#191817] line-clamp-1">
                  {venue.name}
                </h4>
                <div className="text-xs text-[#8E897F] line-clamp-1">
                  {venue.location.city} · {venue.venueType}
                </div>
                <div className="text-[11px] text-[#2D6638] font-medium mt-1">
                  {venue.availabilityNotice}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#F4F2EC]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPitch(venue.id);
                  }}
                  type="button"
                  className="w-full py-1.5 text-xs font-medium rounded-lg bg-[#F4F2EC] hover:bg-[#C85A32] hover:text-white text-[#191817] transition-colors"
                >
                  Pitch Rider
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Performance History & Simulated Earnings */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E5DC] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-xl font-medium text-[#191817]">
              Performance History & Contribution Ledger
            </h2>
            <p className="text-xs text-[#6B665E]">
              Past showcases and social impact contributions (explicitly simulated demonstration figures).
            </p>
          </div>
          <Badge variant="outline" size="sm">
            Simulated Ledger
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E5DC] text-[#8E897F] font-mono uppercase text-[10px]">
                <th className="py-2.5 font-medium">Date</th>
                <th className="py-2.5 font-medium">Show Title</th>
                <th className="py-2.5 font-medium">Venue</th>
                <th className="py-2.5 font-medium">Audience</th>
                <th className="py-2.5 font-medium">Simulated Performer Net (85%)</th>
                <th className="py-2.5 font-medium">Simulated Cause Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F2EC] text-[#5A554D]">
              <tr>
                <td className="py-3 font-mono">Nov 12, 2026</td>
                <td className="py-3 font-medium text-[#191817]">Raga Bhairav Dawn Recital</td>
                <td className="py-3">The Sunken Garden Pavilion</td>
                <td className="py-3">180 attendees</td>
                <td className="py-3 font-semibold text-[#191817]">₹38,250 (Simulated)</td>
                <td className="py-3 text-[#2D6638] font-medium">₹6,750 (Delta Melody)</td>
              </tr>
              <tr>
                <td className="py-3 font-mono">Oct 28, 2026</td>
                <td className="py-3 font-medium text-[#191817]">Baroque & Sitar Dialogue II</td>
                <td className="py-3">The Vault Amphitheater</td>
                <td className="py-3">140 attendees</td>
                <td className="py-3 font-semibold text-[#191817]">₹44,200 (Simulated)</td>
                <td className="py-3 text-[#2D6638] font-medium">₹7,800 (Riverbank School)</td>
              </tr>
              <tr>
                <td className="py-3 font-mono">Oct 04, 2026</td>
                <td className="py-3 font-medium text-[#191817]">Autumn Acoustic Sessions</td>
                <td className="py-3">Acoustic Cellar at Old Mill</td>
                <td className="py-3">55 attendees</td>
                <td className="py-3 font-semibold text-[#191817]">₹38,250 (Simulated)</td>
                <td className="py-3 text-[#2D6638] font-medium">₹6,750 (Shelter Stories)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Pitch Modal */}
      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedVenueId={preselectedVenueId}
        onSuccessToast={(title) => handleToast(`Performance pitch '${title}' was successfully submitted!`)}
      />

      {/* Request Details & History Modal */}
      {detailsModalReq && (
        <RequestDetailsModal
          request={detailsModalReq}
          isOpen={true}
          onClose={() => setDetailsModalReq(null)}
          onEdit={() => {
            setEditModalReq(detailsModalReq);
            setDetailsModalReq(null);
          }}
          onWithdraw={() => {
            setWithdrawModalReq(detailsModalReq);
            setDetailsModalReq(null);
          }}
          onResubmit={() => {
            handleResubmit(detailsModalReq);
            setDetailsModalReq(null);
          }}
          onDuplicate={() => {
            handleDuplicate(detailsModalReq);
            setDetailsModalReq(null);
          }}
          viewerRole="performer"
        />
      )}

      {/* Edit Request Modal */}
      {editModalReq && (
        <EditRequestModal
          request={editModalReq}
          isOpen={true}
          onClose={() => setEditModalReq(null)}
          onSaved={(title) => handleToast(`Pitch '${title}' alterations saved successfully.`)}
        />
      )}

      {/* Withdraw Confirmation Modal */}
      {withdrawModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E8E5DC] shadow-2xl max-w-md w-full p-6 text-[#191817]">
            <h3 className="font-editorial text-xl font-bold mb-2">
              Withdraw Performance Pitch?
            </h3>
            <p className="text-xs text-[#6B665E] leading-relaxed mb-6">
              Are you sure you want to withdraw <strong>&lsquo;{withdrawModalReq.title}&rsquo;</strong>? The venue host will be notified, and this pitch will no longer be considered for scheduling. You can duplicate it as a new pitch later if needed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setWithdrawModalReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6B665E] hover:text-[#191817]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmWithdraw}
                disabled={isWithdrawing}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {isWithdrawing ? "Withdrawing..." : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Venue Details Modal */}
      {selectedVenueModal && (
        <VenueDetailsModal
          venue={selectedVenueModal}
          isOpen={true}
          onClose={() => setSelectedVenueModal(null)}
          onPitch={(vId) => handleOpenPitch(vId)}
          viewerRole="performer"
        />
      )}

      {/* Gig Event Details Modal */}
      {selectedGigModal && (
        <EventDetailsModal
          event={selectedGigModal}
          isOpen={true}
          onClose={() => setSelectedGigModal(null)}
          isAlreadyBooked={true}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { VenueImage } from "@/components/ui/VenueImage";
import {
  BuildingIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { AddVenueModal } from "@/components/dashboard/AddVenueModal";
import { RequestDetailsModal } from "@/components/requests/RequestDetailsModal";
import { ReturnRequestModal } from "@/components/requests/ReturnRequestModal";
import { VenueDetailsModal } from "@/components/dashboard/VenueDetailsModal";
import { ProviderAiDecisionSupport } from "@/components/dashboard/ProviderAiDecisionSupport";
import { useStageStore } from "@/context/StageStoreContext";
import { PerformanceRequest, StageVenue } from "@/types";

export default function StageProviderDashboardPage() {
  const { venues, requests, events, updateRequestStatus } = useStageStore();
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals for Request details, Return for Changes, and Venue details
  const [detailsModalReq, setDetailsModalReq] = useState<PerformanceRequest | null>(null);
  const [returnModalReq, setReturnModalReq] = useState<PerformanceRequest | null>(null);
  const [selectedVenueModal, setSelectedVenueModal] = useState<StageVenue | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "returned" | "approved">("all");

  const incomingRequests = requests;
  const pendingRequests = incomingRequests.filter((r) => r.status === "pending");

  const filteredRequests = incomingRequests.filter((r) => {
    if (filterStatus === "all") return true;
    return r.status === filterStatus;
  });

  // Dynamic calculations across hosted events
  const totalAudienceHosted = events.reduce(
    (sum, e) => sum + (e.seats.total - e.seats.available),
    0
  );
  // Simulated facility share: base ₹45,000 + ₹150 facility share per ticket
  const simulatedHostFees = 45000 + Math.round(totalAudienceHosted * 150);

  const handleApprove = (id: string, title: string, note?: string) => {
    updateRequestStatus(id, "approved", note || "Approved by venue host. Technical sound check scheduled.");
    setToastMessage(`Request '${title}' approved! Added to scheduled performances.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleReject = (id: string, title: string, note?: string) => {
    updateRequestStatus(id, "rejected", note || "Declined: Date conflict or capacity constraints.");
    setToastMessage(`Request '${title}' declined.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleReturn = (id: string, title: string, note?: string) => {
    updateRequestStatus(id, "returned", note || "Returned for technical rider clarification or alternate date.");
    setToastMessage(`Request '${title}' returned to performer for adjustment.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleVenueAdded = (name: string) => {
    setToastMessage(`Venue '${name}' added to your active spaces.`);
    setTimeout(() => setToastMessage(null), 5000);
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

      {/* Provider Header Summary */}
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-2xl sm:text-3xl font-medium text-[#191817]">
                Stage Provider Operations
              </h1>
              <Badge variant="status" size="sm">
                Active Host
              </Badge>
            </div>
            <p className="text-xs font-mono text-[#8E897F]">
              Heritage Arts Trust & Allied Stage Stewards · {venues.length} Managed Locations
            </p>
            <p className="text-xs sm:text-sm text-[#5A554D] max-w-2xl leading-relaxed pt-1">
              Curate incoming performer riders, schedule acoustic sound checks, request revisions, and manage physical availability across your spaces.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => setIsAddVenueOpen(true)}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-xs sm:text-sm transition-colors shadow-2xs"
            >
              <PlusIcon size={16} />
              <span>Add New Venue</span>
            </button>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-[#F4F2EC]">
          <button
            type="button"
            onClick={() => document.getElementById("listed-spaces")?.scrollIntoView({ behavior: "smooth" })}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View managed performance spaces"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] group-hover:text-[#191817] flex items-center justify-between">
              <span>Listed Stages</span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817] mt-0.5">
              {venues.length} Spaces
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus("pending");
              document.getElementById("incoming-pitches")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Filter pending pitches awaiting host review"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] group-hover:text-[#C85A32] flex items-center justify-between">
              <span>Pending Pitches</span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ Review</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#C85A32] mt-0.5">
              {pendingRequests.length} Waiting
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setToastMessage(
                `Simulated Host Fees: ₹45,000 baseline reserve + ₹150 facility share per guest hosted across your ${venues.length} stages (${totalAudienceHosted} attendees total).`
              )
            }
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Click to view host fee structure"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Simulated Fees</span>
                <span className="text-[9px] lowercase text-[#8E897F]">(simulated)</span>
              </span>
              <span className="text-[10px] text-[#8E897F] opacity-0 group-hover:opacity-100 transition-opacity">ℹ Info</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817] mt-0.5">
              ₹{simulatedHostFees.toLocaleString()}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setToastMessage(
                `Audience Hosted: ${totalAudienceHosted} guests attended performances at your venues with verified check-in procedures.`
              )
            }
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Click to view hosted guest metrics"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Audience Hosted</span>
                <span className="text-[9px] lowercase text-[#8E897F]">(simulated)</span>
              </span>
              <span className="text-[10px] text-[#2D6638] opacity-0 group-hover:opacity-100 transition-opacity">ℹ Info</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#2D6638] mt-0.5">
              {totalAudienceHosted} Guests
            </div>
          </button>
        </div>
      </div>

      {/* In-Workspace AI Capabilities: Evaluation, Compatibility Scoring, Decision Support & Confirmation */}
      <ProviderAiDecisionSupport
        onRequestApproved={handleApprove}
        onRequestRejected={handleReject}
        onRequestReturned={handleReturn}
      />

      {/* Section 1: Incoming Performer Requests (Approve / Return / Reject) */}
      <section id="incoming-pitches" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Incoming Performer Pitches
            </h2>
            <p className="text-xs text-[#6B665E]">
              Review technical riders, approve dates, or request adjustments before clearing sound checks.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E8E5DC] text-xs">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterStatus === "all"
                  ? "bg-[#191817] text-white font-semibold"
                  : "text-[#6B665E] hover:text-[#191817]"
              }`}
            >
              All ({incomingRequests.length})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterStatus === "pending"
                  ? "bg-[#C85A32] text-white font-semibold"
                  : "text-[#6B665E] hover:text-[#191817]"
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              onClick={() => setFilterStatus("returned")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterStatus === "returned"
                  ? "bg-[#6B21A8] text-white font-semibold"
                  : "text-[#6B665E] hover:text-[#191817]"
              }`}
            >
              Changes Requested ({incomingRequests.filter((r) => r.status === "returned").length})
            </button>
            <button
              onClick={() => setFilterStatus("approved")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterStatus === "approved"
                  ? "bg-[#2D6638] text-white font-semibold"
                  : "text-[#6B665E] hover:text-[#191817]"
              }`}
            >
              Approved ({incomingRequests.filter((r) => r.status === "approved").length})
            </button>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#D5D1C6] text-xs text-[#8E897F]">
            No pitches matching &lsquo;{filterStatus}&rsquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-5 rounded-2xl border border-[#E8E5DC] shadow-2xs hover:border-[#D5D1C6] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm sm:text-base text-[#191817]">
                      {req.title}
                    </span>
                    <Badge variant="default" size="sm">
                      {req.artForm}
                    </Badge>
                    <span className="text-xs text-[#8E897F]">
                      by <strong className="text-[#191817]">{req.performerName}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B665E]">
                    <span className="flex items-center gap-1 font-medium text-[#C85A32]">
                      <BuildingIcon size={12} />
                      Target: {req.venueName || "General Open Call"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon size={12} />
                      {req.date} {req.time ? `· ${req.time}` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon size={12} />
                      Expected: ~{req.expectedAudienceSize} guests
                    </span>
                    <span className="font-mono text-[11px] text-[#2D6638]">
                      Budget: {req.currency} {req.budget.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#5A554D] italic line-clamp-1 pt-0.5">
                    Rider: &ldquo;{req.description}&rdquo;
                  </p>

                  {req.reviewNote && (
                    <div className="pt-1">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg inline-block ${
                          req.status === "returned"
                            ? "bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]"
                            : req.status === "approved"
                            ? "bg-[#EDF5ED] text-[#2D6638]"
                            : "bg-[#F4F2EC] text-[#5A554D]"
                        }`}
                      >
                        Feedback note: {req.reviewNote}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions or Status */}
                <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => setDetailsModalReq(req)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-[#191817] bg-[#F4F2EC] hover:bg-[#ECEAE1] transition-colors"
                  >
                    View Details
                  </button>

                  {req.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleApprove(req.id, req.title)}
                        type="button"
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#2D6638] text-white hover:bg-[#23522c] transition-colors shadow-2xs"
                      >
                        <CheckIcon size={13} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => setReturnModalReq(req)}
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF] hover:bg-[#F3E8FF] transition-colors"
                      >
                        <ClockIcon size={13} />
                        <span>Request Changes</span>
                      </button>
                      <button
                        onClick={() => handleReject(req.id, req.title)}
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-[#C53030] border border-[#F8D2C9] hover:bg-[#FDF0ED] transition-colors"
                      >
                        <XIcon size={13} />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : req.status === "returned" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F0FF] text-[#6B21A8] border border-[#E9D5FF]">
                      <ClockIcon size={13} /> Changes Requested
                    </span>
                  ) : req.status === "approved" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF]">
                      <CheckCircleIcon size={13} /> Approved
                    </span>
                  ) : req.status === "withdrawn" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F4F2EC] text-[#6B665E] border border-[#E8E5DC]">
                      <XIcon size={13} /> Withdrawn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF0ED] text-[#C53030] border border-[#F8D2C9]">
                      <XIcon size={13} /> Declined
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Manage Listed Venues */}
      <section id="listed-spaces" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Managed Venues & Availability
            </h2>
            <p className="text-xs text-[#6B665E]">
              Your active performance locations available for artist discovery ({venues.length} spaces listed).
            </p>
          </div>
          <Badge variant="status" size="sm">
            Live Directory
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {venues.map((venue) => (
            <div
              key={venue.id}
              onClick={() => setSelectedVenueModal(venue)}
              className="bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs hover:border-[#C85A32]/60 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
              title="Click to view space details, amenities & host policy"
            >
              <div>
                <div className="relative aspect-[16/8] bg-[#191817]">
                  <VenueImage
                    src={venue.imageUrl}
                    alt={venue.name}
                    venueId={venue.id}
                    venueName={venue.name}
                    venueType={venue.venueType}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge variant="dark" size="sm">
                      {venue.venueType}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between text-xs">
                    <span>{venue.location.neighborhood}, {venue.location.city}</span>
                    <span className="bg-black/50 px-2 py-0.5 rounded-full text-[11px]">
                      {venue.capacity.formatted}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-editorial text-xl font-medium text-[#191817]">
                    {venue.name}
                  </h3>

                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {venue.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="px-2 py-0.5 rounded bg-[#F4F2EC] text-[#5A554D]"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="p-3 bg-[#FAF4EB] rounded-xl text-xs text-[#A66E2E]">
                    <span className="font-semibold">Host Terms: </span>
                    <span>{venue.host.policy}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-[#F4F2EC] mt-2">
                <div className="pt-3 flex items-center justify-between text-xs">
                  <span className="text-[#2D6638] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78] animate-pulse" />
                    {venue.availabilityNotice}
                  </span>
                  <span className="text-xs text-[#8E897F] cursor-pointer hover:text-[#191817]">
                    Manage Calendar →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Upcoming Scheduled Events */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E5DC] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-xl font-medium text-[#191817]">
              Scheduled Showcases & Host Revenue
            </h2>
            <p className="text-xs text-[#6B665E]">
              Confirmed calendar of upcoming gigs scheduled at your spaces (all figures explicitly simulated).
            </p>
          </div>
          <Badge variant="outline" size="sm">
            Simulated Revenue
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E5DC] text-[#8E897F] font-mono uppercase text-[10px]">
                <th className="py-2.5 font-medium">Date</th>
                <th className="py-2.5 font-medium">Performance Title</th>
                <th className="py-2.5 font-medium">Venue Space</th>
                <th className="py-2.5 font-medium">Performer</th>
                <th className="py-2.5 font-medium">Ticket Sales</th>
                <th className="py-2.5 font-medium">Simulated Facility Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F2EC] text-[#5A554D]">
              {events.slice(0, 3).map((evt) => {
                const ticketsSold = evt.seats.total - evt.seats.available;
                const simulatedFacilityShare = Math.round(ticketsSold * 150);
                return (
                  <tr key={evt.id}>
                    <td className="py-3 font-mono">{evt.date}</td>
                    <td className="py-3 font-medium text-[#191817]">{evt.title}</td>
                    <td className="py-3">{evt.location.venueName}</td>
                    <td className="py-3">{evt.performer.name}</td>
                    <td className="py-3">{ticketsSold} / {evt.seats.total} seats</td>
                    <td className="py-3 font-semibold text-[#191817]">
                      ₹{simulatedFacilityShare.toLocaleString()} (Simulated)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Venue Modal */}
      <AddVenueModal
        isOpen={isAddVenueOpen}
        onClose={() => setIsAddVenueOpen(false)}
        onSuccessToast={handleVenueAdded}
      />

      {/* Request Details Modal */}
      {detailsModalReq && (
        <RequestDetailsModal
          request={detailsModalReq}
          isOpen={true}
          onClose={() => setDetailsModalReq(null)}
          onApprove={() => {
            handleApprove(detailsModalReq.id, detailsModalReq.title);
            setDetailsModalReq(null);
          }}
          onDecline={() => {
            handleReject(detailsModalReq.id, detailsModalReq.title);
            setDetailsModalReq(null);
          }}
          onRequestChanges={() => {
            setReturnModalReq(detailsModalReq);
            setDetailsModalReq(null);
          }}
          viewerRole="provider"
        />
      )}

      {/* Return for Changes Modal */}
      {returnModalReq && (
        <ReturnRequestModal
          request={returnModalReq}
          isOpen={true}
          onClose={() => setReturnModalReq(null)}
          onReturned={(title) => setToastMessage(`Revision feedback sent for pitch '${title}'.`)}
        />
      )}

      {/* Venue Details Modal */}
      {selectedVenueModal && (
        <VenueDetailsModal
          venue={selectedVenueModal}
          isOpen={true}
          onClose={() => setSelectedVenueModal(null)}
          viewerRole="provider"
        />
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  BuildingIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { AddVenueModal } from "@/components/dashboard/AddVenueModal";
import { useStageStore } from "@/context/StageStoreContext";

export default function StageProviderDashboardPage() {
  const { venues, requests, events, updateRequestStatus } = useStageStore();
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const incomingRequests = requests;
  const pendingRequests = incomingRequests.filter((r) => r.status === "pending");

  // Dynamic calculations across hosted events
  const totalAudienceHosted = events.reduce(
    (sum, e) => sum + (e.seats.total - e.seats.available),
    0
  );
  // Simulated facility share: base ₹45,000 + ₹150 facility share per ticket
  const simulatedHostFees = 45000 + Math.round(totalAudienceHosted * 150);

  const handleApprove = (id: string, title: string) => {
    updateRequestStatus(id, "approved", "Approved by venue host. Technical sound check scheduled.");
    setToastMessage(`Request '${title}' approved! Added to scheduled performances.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleReject = (id: string, title: string) => {
    updateRequestStatus(id, "rejected", "Declined: Date conflict or capacity constraints.");
    setToastMessage(`Request '${title}' declined.`);
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
              Curate incoming performer riders, schedule acoustic sound checks, and manage physical availability across your spaces.
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

        {/* Operational Metrics (Explicitly Identified as Simulated) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-[#F4F2EC]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F]">
              Listed Stages
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817]">
              {venues.length} Spaces
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F]">
              Pending Pitches
            </div>
            <div className="font-editorial text-2xl font-bold text-[#C85A32]">
              {pendingRequests.length} Waiting
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center gap-1">
              <span>Simulated Host Fees</span>
              <span className="text-[9px] lowercase text-[#8E897F]">(demo)</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817]">
              ₹{simulatedHostFees.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center gap-1">
              <span>Audience Hosted</span>
              <span className="text-[9px] lowercase text-[#8E897F]">(demo)</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#2D6638]">
              {totalAudienceHosted} Guests
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Incoming Performer Requests (Approve / Reject) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Incoming Performer Requests
            </h2>
            <p className="text-xs text-[#6B665E]">
              Review performance pitches, requested dates, and riders submitted by artists.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8E897F]">
            {pendingRequests.length} Pending Actions
          </span>
        </div>

        {incomingRequests.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#D5D1C6] text-xs text-[#8E897F]">
            No incoming requests currently.
          </div>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map((req) => (
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
                    <span className="font-mono text-[11px] text-[#8E897F]">
                      Simulated Budget: ₹{req.budget.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#5A554D] italic line-clamp-1 pt-0.5">
                    Rider note: &ldquo;{req.description}&rdquo;
                  </p>
                </div>

                {/* Actions or Status */}
                <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
                  {req.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleApprove(req.id, req.title)}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#2D6638] text-white hover:bg-[#23522c] transition-colors shadow-2xs"
                      >
                        <CheckIcon size={13} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(req.id, req.title)}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-[#C53030] border border-[#F8D2C9] hover:bg-[#FDF0ED] transition-colors"
                      >
                        <XIcon size={13} />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : req.status === "approved" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF]">
                      <CheckCircleIcon size={13} /> Approved
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
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Managed Venues & Availability
            </h2>
            <p className="text-xs text-[#6B665E]">
              Your active performance locations available for artist discovery ({venues.length} spaces listed).
            </p>
          </div>
          <Badge variant="demo" size="sm">
            Live Directory
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/8] bg-[#191817]">
                  <Image
                    src={venue.imageUrl}
                    alt={venue.name}
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
          <Badge variant="demo" size="sm">
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
    </div>
  );
}

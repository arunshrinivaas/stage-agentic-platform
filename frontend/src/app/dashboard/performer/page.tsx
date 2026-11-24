"use client";

import React, { useState } from "react";
import Image from "next/image";
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
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { CreateRequestModal } from "@/components/dashboard/CreateRequestModal";
import { useStageStore } from "@/context/StageStoreContext";

export default function PerformerDashboardPage() {
  const { requests, venues, events } = useStageStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preselectedVenueId, setPreselectedVenueId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleToast = (title: string) => {
    setToastMessage(`Performance pitch '${title}' was successfully submitted!`);
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
              <span>Create Performance Request</span>
            </button>
          </div>
        </div>

        {/* Performer Metrics Bar (Explicitly Identified as Simulated) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-[#F4F2EC]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F]">
              Upcoming Gigs
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817]">
              {upcomingGigs.length} Shows
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F]">
              Active Pitches
            </div>
            <div className="font-editorial text-2xl font-bold text-[#C85A32]">
              {performerRequests.filter((r) => r.status === "pending").length} Pending
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center gap-1">
              <span>Simulated Earnings</span>
              <span className="text-[9px] lowercase text-[#8E897F]">(demo)</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817]">
              ₹{simulatedEarnings.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center gap-1">
              <span>Pledged to Causes</span>
              <span className="text-[9px] lowercase text-[#8E897F]">(demo)</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#2D6638]">
              ₹{simulatedPledged.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Venue Requests & Status Tracking */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Stage Requests & Approvals
            </h2>
            <p className="text-xs text-[#6B665E]">
              Track the status of your technical riders submitted to stage hosts.
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
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0">
                  {req.status === "approved" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF]">
                      <CheckCircleIcon size={13} /> Approved by Host
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
                </div>
              </div>

              {/* Rider Note / Host Feedback */}
              <div className="pt-3 text-xs text-[#5A554D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="line-clamp-1 italic">
                  &ldquo;{req.description}&rdquo;
                </p>
                {req.reviewNote && (
                  <span className="text-[11px] font-medium text-[#191817] bg-[#F4F2EC] px-2.5 py-1 rounded-lg shrink-0">
                    Host: {req.reviewNote}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Upcoming Confirmed Performances */}
      <section className="space-y-4">
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
              className="bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs flex flex-col justify-between"
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

      {/* Section 3: Discover Available Stages (Shows all venues without truncation) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Discover Available Stages
            </h2>
            <p className="text-xs text-[#6B665E]">
              Venues currently accepting performance requests and acoustic riders ({venues.length} spaces available).
            </p>
          </div>
          <Badge variant="demo" size="sm">
            Venue Directory
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="bg-white p-4 rounded-2xl border border-[#E8E5DC] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-[#191817]">
                  <Image
                    src={venue.imageUrl}
                    alt={venue.name}
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
                  onClick={() => handleOpenPitch(venue.id)}
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
          <Badge variant="demo" size="sm">
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

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedVenueId={preselectedVenueId}
        onSuccessToast={handleToast}
      />
    </div>
  );
}

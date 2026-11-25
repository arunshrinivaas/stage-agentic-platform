"use client";

import React, { useState } from "react";
import { XIcon, CheckIcon, CalendarIcon, MapPinIcon, TicketIcon, BuildingIcon, HeartIcon } from "./Icons";
import { Badge } from "./Badge";
import { PerformanceEvent, StageVenue, SocialCause } from "@/types";

export type ModalPayload =
  | { type: "event"; data: PerformanceEvent }
  | { type: "venue"; data: StageVenue }
  | { type: "cause"; data: SocialCause }
  | null;

interface ReservationModalProps {
  payload: ModalPayload;
  onClose: () => void;
}

export function ReservationModal({ payload, onClose }: ReservationModalProps) {
  const [ticketCount, setTicketCount] = useState(1);
  const [contributionAmount, setContributionAmount] = useState(500);
  const [requestedDate, setRequestedDate] = useState("2026-12-12");
  const [performerGenre, setPerformerGenre] = useState("Acoustic / Indie");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!payload) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#191817]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#FAFAF7] rounded-2xl border border-[#E8E5DC] shadow-2xl p-6 sm:p-8 z-10 transition-all my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
          aria-label="Close dialog"
        >
          <XIcon size={20} />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#EDF5ED] text-[#2D6638] flex items-center justify-center mb-4">
              <CheckIcon size={28} />
            </div>
            <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-2">
              Demonstration Confirmed
            </h3>
            <p className="text-sm text-[#6B665E] mb-6 max-w-sm mx-auto leading-relaxed">
              This is a prototype milestone preview. No real transaction has occurred, but your interaction has been validated successfully.
            </p>
            <div className="p-3 bg-[#FAF4EB] border border-[#ECD9BA] rounded-xl text-xs text-[#A66E2E] mb-6">
              <strong>Milestone 1 Preview:</strong> Live reservation dispatch and role-based agent confirmation will be activated in upcoming milestones.
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 px-5 rounded-full bg-[#191817] text-[#FAFAF7] hover:bg-[#2D2A26] font-medium text-sm transition-all"
            >
              Back to Discover
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">Sandbox Reservation</Badge>
              {payload.type === "event" && <Badge variant="terracotta">Reserve Seat</Badge>}
              {payload.type === "venue" && <Badge variant="default">Stage Rider Request</Badge>}
              {payload.type === "cause" && <Badge variant="terracotta">Impact Contribution</Badge>}
            </div>

            {payload.type === "event" && (
              <>
                <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-2">
                  {payload.data.title}
                </h3>
                <p className="text-sm text-[#6B665E] mb-4">
                  By <span className="text-[#191817] font-medium">{payload.data.performer.name}</span>
                </p>

                <div className="bg-[#F4F2EC] p-3.5 rounded-xl border border-[#E8E5DC] text-xs text-[#5A554D] space-y-1.5 mb-5">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className="text-[#C85A32]" />
                    <span>{payload.data.date} · {payload.data.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPinIcon size={14} className="text-[#C85A32]" />
                    <span>{payload.data.location.venueName}, {payload.data.location.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TicketIcon size={14} className="text-[#C85A32]" />
                    <span>{payload.data.seats.available} seats left · {payload.data.seats.priceLabel}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Number of Seats
                    </label>
                    <div className="flex items-center gap-3">
                      {[1, 2, 4, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTicketCount(num)}
                          className={`flex-1 py-2 text-xs rounded-lg font-medium border transition-all ${
                            ticketCount === num
                              ? "bg-[#C85A32] text-white border-[#C85A32]"
                              : "bg-white text-[#191817] border-[#E8E5DC] hover:border-[#D5D1C6]"
                          }`}
                        >
                          {num} {num === 1 ? "Seat" : "Seats"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Attendee Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Sharma"
                      defaultValue="Pooja Sen"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Email Address (for digital passes)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      defaultValue="pooja.sen@example.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                    />
                  </div>

                  {payload.data.linkedCause && (
                    <div className="p-3 bg-[#FBF0EB] border border-[#F5DACD] rounded-xl text-xs text-[#C85A32] flex items-center gap-2">
                      <HeartIcon size={16} className="shrink-0" />
                      <span>
                        {payload.data.linkedCause.percentageContribution}% of this pass supports{" "}
                        <strong>{payload.data.linkedCause.name}</strong>.
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-full bg-[#C85A32] text-white hover:bg-[#B54D27] font-medium text-sm transition-all shadow-sm"
                  >
                    Confirm Demo Reservation
                  </button>
                </form>
              </>
            )}

            {payload.type === "venue" && (
              <>
                <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-2">
                  Request {payload.data.name}
                </h3>
                <p className="text-sm text-[#6B665E] mb-4">
                  {payload.data.venueType} · {payload.data.location.neighborhood}, {payload.data.location.city}
                </p>

                <div className="bg-[#F4F2EC] p-3.5 rounded-xl border border-[#E8E5DC] text-xs text-[#5A554D] space-y-1.5 mb-5">
                  <div className="flex items-center gap-2">
                    <BuildingIcon size={14} className="text-[#C85A32]" />
                    <span>Capacity: {payload.data.capacity.formatted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#191817]">Host Policy:</span>
                    <span>{payload.data.host.policy}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Performance Art Form / Set Type
                    </label>
                    <input
                      type="text"
                      value={performerGenre}
                      onChange={(e) => setPerformerGenre(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Proposed Date
                    </label>
                    <input
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Brief Rider Note / Tech Requirements
                    </label>
                    <textarea
                      rows={2}
                      defaultValue="2 vocal mics, DI box for acoustic cello, warm spotlight."
                      className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-full bg-[#191817] text-[#FAFAF7] hover:bg-[#2D2A26] font-medium text-sm transition-all"
                  >
                    Submit Stage Pitch (Demo)
                  </button>
                </form>
              </>
            )}

            {payload.type === "cause" && (
              <>
                <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-2">
                  Support {payload.data.title}
                </h3>
                <p className="text-sm text-[#6B665E] mb-4">
                  Organized by <span className="text-[#191817] font-medium">{payload.data.organizer.name}</span>
                </p>

                <div className="bg-[#F4F2EC] p-3.5 rounded-xl border border-[#E8E5DC] text-xs text-[#5A554D] space-y-1.5 mb-5">
                  <div className="flex justify-between items-center text-xs">
                    <span>Current Impact Pool</span>
                    <span className="font-semibold text-[#191817]">
                      {payload.data.currency}
                      {payload.data.currentAmount.toLocaleString()} / {payload.data.currency}
                      {payload.data.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[#E8E5DC] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#C85A32] h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (payload.data.currentAmount / payload.data.targetAmount) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Select Contribution Amount (Demo)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[250, 500, 1000, 2500, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setContributionAmount(amt)}
                          className={`py-2 text-xs rounded-lg font-medium border transition-all ${
                            contributionAmount === amt
                              ? "bg-[#C85A32] text-white border-[#C85A32]"
                              : "bg-white text-[#191817] border-[#E8E5DC] hover:border-[#D5D1C6]"
                          }`}
                        >
                          {payload.data.currency}{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#191817] mb-1.5">
                      Contributor Name or Anonymous Note
                    </label>
                    <input
                      type="text"
                      defaultValue="A Friend of the Arts"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-full bg-[#C85A32] text-white hover:bg-[#B54D27] font-medium text-sm transition-all"
                  >
                    Simulate Contribution of {payload.data.currency}{contributionAmount}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


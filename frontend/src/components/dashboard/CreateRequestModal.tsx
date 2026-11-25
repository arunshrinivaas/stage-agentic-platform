"use client";

import React, { useState } from "react";
import { XIcon, CheckIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { ArtCategory } from "@/types";
import { useStageStore } from "@/context/StageStoreContext";

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedVenueId?: string;
  onSuccessToast?: (title: string) => void;
}

const ART_FORMS: Array<Exclude<ArtCategory, "All">> = [
  "Music",
  "Dance",
  "Theatre",
  "Spoken Word",
  "Street Performance",
];

export function CreateRequestModal({
  isOpen,
  onClose,
  preselectedVenueId,
  onSuccessToast,
}: CreateRequestModalProps) {
  const { venues, createPerformanceRequest } = useStageStore();

  const [title, setTitle] = useState("");
  const [artForm, setArtForm] = useState<Exclude<ArtCategory, "All">>("Music");
  const [preferredLocation, setPreferredLocation] = useState("Kolkata Waterfront");
  const [selectedVenueId, setSelectedVenueId] = useState(preselectedVenueId || "");
  const [date, setDate] = useState("2026-12-20");
  const [time] = useState("7:00 PM");
  const [expectedAudienceSize, setExpectedAudienceSize] = useState(100);
  const [budget, setBudget] = useState(30000);
  const [description, setDescription] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedVenue = venues.find((v) => v.id === selectedVenueId);

    createPerformanceRequest({
      performerId: "perf-mehta",
      performerName: "Aarav Mehta & Clara Dubois",
      performerHandle: "@mehta.dubois",
      title: title || "New Acoustic Recital",
      artForm,
      preferredLocation,
      venueId: selectedVenue?.id,
      venueName: selectedVenue?.name || "General Stage Open Call",
      date,
      time,
      expectedAudienceSize: Number(expectedAudienceSize),
      budget: Number(budget),
      currency: "₹",
      description:
        description ||
        "Acoustic chamber showcase requiring tuned resonance, dedicated DI audio inputs, and natural stage lighting.",
    });

    setIsSubmitted(true);
    onSuccessToast?.(title || "Performance Request");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#191817]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#FAFAF7] rounded-2xl border border-[#E8E5DC] shadow-2xl p-6 sm:p-8 z-10 my-8">
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
              Performance Request Submitted
            </h3>
            <p className="text-sm text-[#6B665E] mb-6 max-w-sm mx-auto leading-relaxed">
              Your request has been dispatched to stage hosts. You can track host review status directly in your performer dashboard.
            </p>
            <div className="p-3 bg-[#FAF4EB] border border-[#ECD9BA] rounded-xl text-xs text-[#A66E2E] mb-6">
              <strong>Review Status:</strong> Venue stewards will review your technical rider, check acoustic fit, and schedule a soundcheck.
            </div>
            <button
              onClick={() => {
                setIsSubmitted(false);
                onClose();
              }}
              className="w-full py-3 px-5 rounded-full bg-[#191817] text-white hover:bg-[#2D2A26] font-medium text-sm transition-all"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="terracotta">New Stage Pitch</Badge>
              <Badge variant="status">Live Arts Network</Badge>
            </div>

            <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-1">
              Create Performance Request
            </h3>
            <p className="text-xs text-[#6B665E] mb-5">
              Submit your technical rider and proposed schedule to venue stewards.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Performance Title */}
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Performance Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter Solstice Chamber Suite"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              {/* Art Form & Venue Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Art Form
                  </label>
                  <select
                    value={artForm}
                    onChange={(e) => setArtForm(e.target.value as Exclude<ArtCategory, "All">)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  >
                    {ART_FORMS.map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Target Venue (Optional)
                  </label>
                  <select
                    value={selectedVenueId}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  >
                    <option value="">Any Suitable Stage</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.location.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Location & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Preferred City / Area
                  </label>
                  <input
                    type="text"
                    required
                    value={preferredLocation}
                    onChange={(e) => setPreferredLocation(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Proposed Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>
              </div>

              {/* Audience Size & Estimated Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Expected Audience Size
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={expectedAudienceSize}
                    onChange={(e) => setExpectedAudienceSize(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Estimated Production Budget (₹)
                  </label>
                  <input
                    type="number"
                    step={1000}
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>
              </div>

              {/* Description & Technical Rider Notes */}
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Description & Technical Rider Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Mention acoustic preferences, sound check requirements, lighting needs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitted}
                className="w-full py-3 px-5 rounded-full bg-[#191817] hover:bg-[#C85A32] text-white font-medium text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Performance Pitch
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { PerformanceRequest, StageVenue, ArtCategory } from "@/types";
import { XIcon, SparklesIcon } from "@/components/ui/Icons";
import { useStageStore } from "@/context/StageStoreContext";

interface EditRequestModalProps {
  request: PerformanceRequest;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedTitle: string) => void;
}

const ART_CATEGORIES: Array<Exclude<ArtCategory, "All">> = [
  "Music",
  "Dance",
  "Theatre",
  "Spoken Word",
  "Street Performance",
];

export function EditRequestModal({
  request,
  isOpen,
  onClose,
  onSaved,
}: EditRequestModalProps) {
  const { venues, updateRequest } = useStageStore();

  const [title, setTitle] = useState(request.title);
  const [artForm, setArtForm] = useState(request.artForm);
  const [preferredLocation, setPreferredLocation] = useState(request.preferredLocation);
  const [venueId, setVenueId] = useState(request.venueId || "");
  const [venueName, setVenueName] = useState(request.venueName || "");
  const [date, setDate] = useState(request.date);
  const [time, setTime] = useState(request.time || "7:00 PM");
  const [durationMinutes, setDurationMinutes] = useState(request.durationMinutes || 60);
  const [expectedAudienceSize, setExpectedAudienceSize] = useState(request.expectedAudienceSize);
  const [budget, setBudget] = useState(request.budget);
  const [description, setDescription] = useState(request.description);
  const [technicalRider, setTechnicalRider] = useState(request.technicalRider || "");
  const [notes, setNotes] = useState(request.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isApproved = request.status === "approved";
  const isMaterialChange =
    date !== request.date ||
    venueId !== (request.venueId || "") ||
    budget !== request.budget ||
    title !== request.title;

  const handleVenueChange = (selectedVenueId: string) => {
    setVenueId(selectedVenueId);
    const found = venues.find((v) => v.id === selectedVenueId);
    if (found) {
      setVenueName(found.name);
      setPreferredLocation(found.location.neighborhood || found.location.city);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await updateRequest(request.id, {
        title,
        artForm: artForm as any,
        preferredLocation,
        venueId: venueId || undefined,
        venueName: venueName || undefined,
        date,
        time,
        durationMinutes: Number(durationMinutes),
        expectedAudienceSize: Number(expectedAudienceSize),
        budget: Number(budget),
        description,
        technicalRider,
        notes,
      });

      onSaved(title);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update pitch details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#E8E5DC] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E8E5DC] flex items-center justify-between bg-[#FAFAF7]">
          <div>
            <span className="text-[11px] font-mono uppercase text-[#8E897F] block">
              Edit Performance Pitch
            </span>
            <h2 className="font-editorial text-2xl font-bold text-[#191817]">
              Update Technical Rider & Terms
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8E897F] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            aria-label="Close"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Warning Banner if approved */}
          {isApproved && (
            <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs leading-relaxed flex items-start gap-3">
              <SparklesIcon size={18} className="shrink-0 text-[#D97706] mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">
                  Approval Re-Review Notice
                </strong>
                This pitch is currently <strong>Approved</strong>. Altering material terms (Proposed Date, Target Stage, Budget, or Title) will revert status to <strong>Pending Review</strong> and notify the venue host. Non-material edits (rider notes, descriptions) preserve existing approval.
                {isMaterialChange && (
                  <span className="block mt-1 font-bold text-[#B45309]">
                    ⚠️ Active material changes detected. Submitting will trigger host re-review.
                  </span>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
              Performance Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
                Art Form
              </label>
              <select
                value={artForm}
                onChange={(e) => setArtForm(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none bg-white"
              >
                {ART_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
                Target Stage
              </label>
              <select
                value={venueId}
                onChange={(e) => handleVenueChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none bg-white"
              >
                <option value="">General Open Call</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.location.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
                Proposed Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 7:30 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min={15}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
                Expected Audience Size
              </label>
              <input
                type="number"
                min={10}
                value={expectedAudienceSize}
                onChange={(e) => setExpectedAudienceSize(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
                Production Budget (₹)
              </label>
              <input
                type="number"
                min={1000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
              Performance Description
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
              Technical Rider & Acoustic Setup
            </label>
            <textarea
              rows={2}
              value={technicalRider}
              onChange={(e) => setTechnicalRider(e.target.value)}
              placeholder="e.g. 2 condenser microphones, DI box, monitor wedge..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1">
              Additional Notes for Host
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Timing preferences, guest performers, acoustic drapes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#C85A32] text-xs sm:text-sm text-[#191817] outline-none resize-none"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-[#E8E5DC] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#6B665E] hover:text-[#191817]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#D96B43] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isSubmitting ? "Saving Updates..." : "Save Pitch Alterations →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


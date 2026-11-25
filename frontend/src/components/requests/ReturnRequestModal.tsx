"use client";

import React, { useState } from "react";
import { PerformanceRequest } from "@/types";
import { XIcon, ClockIcon } from "@/components/ui/Icons";
import { useStageStore } from "@/context/StageStoreContext";

interface ReturnRequestModalProps {
  request: PerformanceRequest;
  isOpen: boolean;
  onClose: () => void;
  onReturned: (title: string) => void;
}

export function ReturnRequestModal({
  request,
  isOpen,
  onClose,
  onReturned,
}: ReturnRequestModalProps) {
  const { updateRequestStatus } = useStageStore();
  const [reviewNote, setReviewNote] = useState(
    "Please adjust performance start time to 7:00 PM due to soundcheck window."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateRequestStatus(
        request.id,
        "returned",
        reviewNote.trim() || "Host requested revisions before final approval."
      );
      onReturned(request.title);
      onClose();
    } catch (err: any) {
      console.error("Error returning request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#E8E5DC] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E8E5DC] flex items-center justify-between bg-[#FAFAF7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] text-[#6B21A8] flex items-center justify-center">
              <ClockIcon size={20} />
            </div>
            <div>
              <h2 className="font-editorial text-xl font-bold text-[#191817]">
                Request Pitch Revisions
              </h2>
              <span className="text-[11px] font-mono text-[#8E897F]">
                {request.title} ({request.performerName})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8E897F] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            aria-label="Close"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-[#5A554D] leading-relaxed">
            The performer will be notified of your requested adjustments. They can edit their technical rider, date, or timing specifications and resubmit directly for your approval.
          </p>

          <div>
            <label className="block text-xs font-mono uppercase text-[#6B665E] mb-1.5">
              Host Feedback / Required Changes
            </label>
            <textarea
              rows={4}
              required
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Specify required changes to date, timing, sound constraints, or rider..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D1C6] focus:border-[#6B21A8] text-xs sm:text-sm text-[#191817] outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-[#E8E5DC] flex items-center justify-end gap-3">
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
              className="px-5 py-2.5 rounded-xl bg-[#6B21A8] hover:bg-[#7E22CE] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isSubmitting ? "Sending Feedback..." : "Return for Changes →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


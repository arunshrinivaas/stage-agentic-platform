"use client";

import React, { useState, useEffect } from "react";
import { XIcon, CheckIcon, ShieldCheckIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (title: string) => void;
  initialValues?: {
    title?: string;
    focusArea?: string;
    targetAmount?: number;
    description?: string;
  };
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccessToast,
  initialValues,
}: CreateCampaignModalProps) {
  const { createCampaign } = useStageStore();

  const [title, setTitle] = useState("");
  const [focusArea, setFocusArea] = useState("Youth Arts Education");
  const [targetAmount, setTargetAmount] = useState(400000);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (initialValues) {
      if (initialValues.title) setTitle(initialValues.title);
      if (initialValues.focusArea) setFocusArea(initialValues.focusArea);
      if (initialValues.targetAmount) setTargetAmount(initialValues.targetAmount);
      if (initialValues.description) setDescription(initialValues.description);
    }
  }, [initialValues]);

  if (!isOpen) return null;

  const handleReviewStep = (e: React.FormEvent) => {
    e.preventDefault();
    setIsReviewing(true);
  };

  const handleFinalConfirm = () => {
    createCampaign({
      title: title || "New Community Arts Campaign",
      focusArea,
      targetAmount: Number(targetAmount),
      currency: "₹",
      tagline:
        tagline ||
        "Connecting touring independent artists with underfunded classrooms across the district.",
      description:
        description ||
        "Every ticket pledged by performers directly purchases instruments, pays teacher stipends, and sponsors monthly student transport.",
      organizer: {
        name: "Compassion Arts Collective",
        type: "Grassroots Cultural Trust",
        verified: true,
      },
      imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&auto=format&fit=crop&q=85",
    });

    setIsSubmitted(true);
    setIsReviewing(false);
    onSuccessToast?.(title || "New Campaign");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#191817]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

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
              Campaign Created Successfully
            </h3>
            <p className="text-sm text-[#6B665E] mb-6 max-w-sm mx-auto leading-relaxed">
              Your campaign is now active in the platform directory. Performers and stage providers can link their upcoming ticket sales to your impact pool.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setIsReviewing(false);
                onClose();
              }}
              className="w-full py-3 px-5 rounded-full bg-[#191817] text-white hover:bg-[#2D2A26] font-medium text-sm transition-all"
            >
              Done & Return
            </button>
          </div>
        ) : isReviewing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="terracotta">Review & Confirmation</Badge>
              <Badge variant="status">ImpactFlow Verified</Badge>
            </div>

            <h3 className="font-editorial text-2xl font-medium text-[#191817]">
              Confirm Campaign Publication
            </h3>
            <p className="text-xs text-[#6B665E]">
              Please review your campaign details before publishing to the cultural network directory.
            </p>

            <div className="p-4 rounded-xl border border-[#E8E5DC] bg-white space-y-3 text-xs">
              <div>
                <span className="font-mono uppercase text-[10px] text-[#8E897F] block">Campaign Title</span>
                <span className="font-semibold text-sm text-[#191817]">{title || "New Community Arts Campaign"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F4F2EC]">
                <div>
                  <span className="font-mono uppercase text-[10px] text-[#8E897F] block">Focus Area</span>
                  <span className="font-medium text-[#191817]">{focusArea}</span>
                </div>
                <div>
                  <span className="font-mono uppercase text-[10px] text-[#8E897F] block">Target Goal</span>
                  <span className="font-medium text-[#2D6638]">₹{Number(targetAmount).toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-[#F4F2EC]">
                <span className="font-mono uppercase text-[10px] text-[#8E897F] block">Description & Narrative</span>
                <p className="text-[#5A554D] leading-relaxed line-clamp-3">{description || "Connecting touring independent artists with underfunded classrooms across the district."}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] text-xs text-[#A66E2E] flex items-start gap-2">
              <ShieldCheckIcon size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Deterministic Impact Commitment:</strong> Funds pledged by ticket buyers will adhere to the platform standard: 70% direct project funding, 20% performer honorarium stewardship, and 10% statutory reserve.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReviewing(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#6B665E] hover:bg-[#F4F2EC] transition-colors"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalConfirm}
                className="px-5 py-2.5 rounded-xl bg-[#2D6638] hover:bg-[#23512D] text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-2xs"
              >
                <CheckIcon size={14} />
                <span>Confirm & Publish Campaign</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="terracotta">Social Impact</Badge>
              <Badge variant="status">Active Campaign</Badge>
            </div>

            <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-1">
              Create Social Cause Campaign
            </h3>
            <p className="text-xs text-[#6B665E] mb-5">
              Launch a transparent campaign funded by performer ticket pledges.
            </p>

            <form onSubmit={handleReviewStep} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strings for Hill District Schools"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Impact Focus Area
                  </label>
                  <select
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  >
                    <option value="Youth Arts Education">Youth Arts Education</option>
                    <option value="Mental Health & Shelter Support">Mental Health & Shelter</option>
                    <option value="Folk Preservation & Elder Care">Folk Preservation</option>
                    <option value="Ecological Action in Culture">Ecological Action</option>
                    <option value="Community Accessibility">Community Accessibility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Short Tagline
                </label>
                <input
                  type="text"
                  placeholder="One sentence describing the concrete change"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Cause Narrative & Impact Goals
                </label>
                <textarea
                  rows={3}
                  placeholder="How will ticket contributions be allocated?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitted}
                className="w-full py-3 px-5 rounded-full bg-[#191817] hover:bg-[#C85A32] text-white font-medium text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Review & Confirm Publication</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

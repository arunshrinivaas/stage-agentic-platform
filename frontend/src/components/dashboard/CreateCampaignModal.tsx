"use client";

import React, { useState } from "react";
import { XIcon, CheckIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (title: string) => void;
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccessToast,
}: CreateCampaignModalProps) {
  const { createCampaign } = useStageStore();

  const [title, setTitle] = useState("");
  const [focusArea, setFocusArea] = useState("Youth Arts Education");
  const [targetAmount, setTargetAmount] = useState(400000);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
              Your campaign is now active. Performers and stage providers can link their upcoming ticket sales to your impact pool.
            </p>
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
              <Badge variant="terracotta">Social Impact</Badge>
              <Badge variant="demo">Demo Campaign</Badge>
            </div>

            <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-1">
              Create Social Cause Campaign
            </h3>
            <p className="text-xs text-[#6B665E] mb-5">
              Launch a transparent campaign funded by performer ticket pledges.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full py-3 px-5 rounded-full bg-[#C85A32] text-white hover:bg-[#B54D27] font-medium text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Publish Campaign to Directory
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

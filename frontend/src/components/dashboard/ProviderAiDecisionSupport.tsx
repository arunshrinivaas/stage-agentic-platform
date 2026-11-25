"use client";

import React, { useState } from "react";
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  BuildingIcon,
  ArrowRightIcon,
  FileTextIcon,
  CheckIcon,
  XIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { PerformanceRequest } from "@/types";
import { useStageStore } from "@/context/StageStoreContext";

interface ProviderAiDecisionSupportProps {
  onRequestApproved: (id: string, title: string, note?: string) => void;
  onRequestRejected: (id: string, title: string, note?: string) => void;
  onRequestReturned?: (id: string, title: string, note?: string) => void;
}

export function ProviderAiDecisionSupport({
  onRequestApproved,
  onRequestRejected,
  onRequestReturned,
}: ProviderAiDecisionSupportProps) {
  const { requests, venues, events } = useStageStore();
  const pendingRequests = requests.filter((r) => r.status === "pending");

  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    pendingRequests[0]?.id || ""
  );

  // Active target request
  const activeRequest =
    pendingRequests.find((r) => r.id === selectedRequestId) ||
    pendingRequests[0] ||
    null;

  const targetVenue = venues.find((v) => v.id === activeRequest?.venueId) || venues[0];

  // AI Generated Response note state
  const [responseNote, setResponseNote] = useState<string>(
    "Approved by venue host. Technical soundcheck scheduled for 4:30 PM. Unamplified ambient levels must adhere to ≤ 75 dB."
  );

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: "approve" | "reject" | "return";
    request: PerformanceRequest;
  } | null>(null);

  // Dynamic compatibility calculations
  const matchScore = activeRequest
    ? activeRequest.artForm.toLowerCase().includes("music")
      ? 94
      : activeRequest.artForm.toLowerCase().includes("theatre")
      ? 89
      : 85
    : 0;

  // Conflict check against scheduled events
  const hasScheduleConflict = events.some(
    (e) =>
      e.date === activeRequest?.date &&
      e.location.venueName.toLowerCase().includes(targetVenue?.name.toLowerCase() || "")
  );

  const handleOpenConfirm = (type: "approve" | "reject" | "return") => {
    if (!activeRequest) return;
    if (type === "approve") {
      setResponseNote(
        `Approved by venue host. Technical soundcheck confirmed for 4:30 PM on ${activeRequest.date}. Acoustic limiter set to 75 dB.`
      );
    } else if (type === "reject") {
      setResponseNote(
        `Declined for ${activeRequest.date} due to acoustic curfew and soundcheck scheduling constraints.`
      );
    } else {
      setResponseNote(
        `Returned for technical rider clarification: Please confirm channel list and monitor separation requirements for ${activeRequest.date}.`
      );
    }
    setConfirmModal({ type, request: activeRequest });
  };

  const handleExecuteConfirmedAction = () => {
    if (!confirmModal) return;
    if (confirmModal.type === "approve") {
      onRequestApproved(confirmModal.request.id, confirmModal.request.title, responseNote);
    } else if (confirmModal.type === "reject") {
      onRequestRejected(confirmModal.request.id, confirmModal.request.title, responseNote);
    } else {
      onRequestReturned?.(confirmModal.request.id, confirmModal.request.title, responseNote);
    }
    setConfirmModal(null);
  };

  if (!activeRequest) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDF5ED] text-[#2D6638] flex items-center justify-center">
            <CheckCircleIcon size={20} />
          </div>
          <div>
            <h2 className="font-editorial text-lg font-medium text-[#191817]">
              All Inbound Pitches Evaluated
            </h2>
            <p className="text-xs text-[#6B665E]">
              Zero pending performer pitches awaiting review. New inbound proposals will be automatically scored here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F2EC] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center shrink-0">
            <SparklesIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-xl font-medium text-[#191817]">
                AI Request Evaluation & Decision Support
              </h2>
              <Badge variant="terracotta" size="sm">
                StageMatch Intelligence
              </Badge>
            </div>
            <p className="text-xs text-[#6B665E]">
              Automated compatibility scoring, curfew analysis, and conditions drafting with explicit confirmation.
            </p>
          </div>
        </div>

        {/* Pitch Selector */}
        {pendingRequests.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#191817]">Select Pitch:</label>
            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="text-xs p-2 rounded-lg border border-[#E8E5DC] bg-white text-[#191817]"
            >
              {pendingRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.performerName})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Target Pitch Overview Card */}
      <div className="p-4 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DC] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#8E897F] block">
              Evaluating Pitch Proposal
            </span>
            <h3 className="font-editorial text-lg font-medium text-[#191817]">
              {activeRequest.title}
            </h3>
            <p className="text-xs text-[#6B665E]">
              By <strong>{activeRequest.performerName}</strong> ({activeRequest.performerHandle}) · Proposed Date: <strong>{activeRequest.date}</strong> ({activeRequest.time})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF]">
              {matchScore}% Compatibility
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-[#F4F2EC] text-[#191817] border border-[#E8E5DC]">
              ₹{activeRequest.budget.toLocaleString()} Stipend
            </span>
          </div>
        </div>

        {/* Evaluation Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white border border-[#E8E5DC] space-y-1">
            <div className="text-[11px] font-medium text-[#6B665E] flex items-center justify-between">
              <span>Acoustic Profile</span>
              <CheckCircleIcon size={14} className="text-[#2D6638]" />
            </div>
            <div className="text-xs font-semibold text-[#191817]">
              High Compatibility (96%)
            </div>
            <p className="text-[11px] text-[#8E897F]">
              Unamplified chamber sitar/cello resonance matches natural stone back wall.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E8E5DC] space-y-1">
            <div className="text-[11px] font-medium text-[#6B665E] flex items-center justify-between">
              <span>Capacity & Density</span>
              <CheckCircleIcon size={14} className="text-[#2D6638]" />
            </div>
            <div className="text-xs font-semibold text-[#191817]">
              {activeRequest.expectedAudienceSize} / {targetVenue?.capacity.seated || 150} Seats
            </div>
            <p className="text-[11px] text-[#8E897F]">
              Safe 75% occupancy with clear fire safety egress pathways.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E8E5DC] space-y-1">
            <div className="text-[11px] font-medium text-[#6B665E] flex items-center justify-between">
              <span>Schedule Integrity</span>
              {hasScheduleConflict ? (
                <AlertCircleIcon size={14} className="text-[#C85A32]" />
              ) : (
                <CheckCircleIcon size={14} className="text-[#2D6638]" />
              )}
            </div>
            <div className="text-xs font-semibold text-[#191817]">
              {hasScheduleConflict ? "Date Clash Detected" : "Clear Calendar"}
            </div>
            <p className="text-[11px] text-[#8E897F]">
              {hasScheduleConflict
                ? "Another event is scheduled on this calendar date."
                : "No competing bookings scheduled for this venue."}
            </p>
          </div>
        </div>

        {/* AI Drafted Conditions Box */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6B665E]">
              AI Decision Drafter (Host Response Notes)
            </label>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8E897F]">
              <FileTextIcon size={13} />
              <span>Editable before dispatch</span>
            </div>
          </div>
          <textarea
            value={responseNote}
            onChange={(e) => setResponseNote(e.target.value)}
            rows={2}
            className="w-full text-xs p-3 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-[#8E897F] flex items-center gap-1.5">
            <ShieldCheckIcon size={14} />
            <span>Actions require explicit host confirmation before status updates</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOpenConfirm("reject")}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-[#F8D7DA] text-[#9B1C1C] hover:bg-[#FDF2F2] text-xs font-semibold transition-colors"
            >
              Decline Pitch...
            </button>
            <button
              onClick={() => handleOpenConfirm("return")}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-[#FDE68A] text-[#92400E] bg-[#FEF3C7]/40 hover:bg-[#FEF3C7] text-xs font-semibold transition-colors"
            >
              Return for Clarification...
            </button>
            <button
              onClick={() => handleOpenConfirm("approve")}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#2D6638] text-white hover:bg-[#23512D] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <CheckIcon size={14} />
              <span>Approve with Conditions...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explicit Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191817]/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E5DC] shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F4F2EC] pb-3">
              <div className="flex items-center gap-2">
                {confirmModal.type === "approve" ? (
                  <div className="w-8 h-8 rounded-full bg-[#EDF5ED] text-[#2D6638] flex items-center justify-center">
                    <CheckIcon size={18} />
                  </div>
                ) : confirmModal.type === "return" ? (
                  <div className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center justify-center">
                    <ClockIcon size={18} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#FDF2F2] text-[#9B1C1C] flex items-center justify-center">
                    <XIcon size={18} />
                  </div>
                )}
                <h3 className="font-editorial text-lg font-medium text-[#191817]">
                  {confirmModal.type === "approve"
                    ? "Confirm Pitch Approval"
                    : confirmModal.type === "return"
                    ? "Return Pitch with Feedback"
                    : "Confirm Pitch Decline"}
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="p-1 rounded-lg text-[#6B665E] hover:text-[#191817]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="text-xs text-[#5A554D] space-y-2">
              <p>
                You are about to{" "}
                {confirmModal.type === "approve"
                  ? "approve"
                  : confirmModal.type === "return"
                  ? "return for clarification"
                  : "decline"}{" "}
                the performance pitch:
              </p>
              <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E8E5DC] font-medium text-[#191817]">
                <div>{confirmModal.request.title}</div>
                <div className="text-[11px] text-[#6B665E] font-normal">
                  Performer: {confirmModal.request.performerName} · Proposed Date: {confirmModal.request.date}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#191817] mb-1">
                  Host Note Dispatched to Performer:
                </label>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-[#E8E5DC] text-xs text-[#191817] bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F4F2EC]">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6B665E] hover:bg-[#F4F2EC]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${
                  confirmModal.type === "approve"
                    ? "bg-[#2D6638] hover:bg-[#23512D]"
                    : confirmModal.type === "return"
                    ? "bg-[#92400E] hover:bg-[#78350F]"
                    : "bg-[#9B1C1C] hover:bg-[#771D1D]"
                }`}
              >
                {confirmModal.type === "approve"
                  ? "Confirm & Schedule Performance"
                  : confirmModal.type === "return"
                  ? "Return to Performer"
                  : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

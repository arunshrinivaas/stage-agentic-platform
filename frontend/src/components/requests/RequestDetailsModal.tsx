"use client";

import React from "react";
import { PerformanceRequest } from "@/types";
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";

interface RequestDetailsModalProps {
  request: PerformanceRequest;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onWithdraw?: () => void;
  onResubmit?: () => void;
  onDuplicate?: () => void;
  onRequestChanges?: () => void;
  onApprove?: () => void;
  onDecline?: () => void;
  viewerRole?: "performer" | "provider" | "audience" | "organiser" | "admin";
}

export function RequestDetailsModal({
  request,
  isOpen,
  onClose,
  onEdit,
  onWithdraw,
  onResubmit,
  onDuplicate,
  onRequestChanges,
  onApprove,
  onDecline,
  viewerRole = "performer",
}: RequestDetailsModalProps) {
  if (!isOpen) return null;

  const isPerformer = viewerRole === "performer" || viewerRole === "admin";
  const isProvider = viewerRole === "provider" || viewerRole === "admin";

  const renderStatusBadge = () => {
    switch (request.status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF]">
            <CheckCircleIcon size={13} /> Approved by Host
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F0FF] text-[#6B21A8] border border-[#E9D5FF]">
            <ClockIcon size={13} /> Changes Requested
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF4EB] text-[#A66E2E] border border-[#ECD9BA]">
            <ClockIcon size={13} /> Pending Review
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF0ED] text-[#C53030] border border-[#F8D2C9]">
            <XCircleIcon size={13} /> Declined
          </span>
        );
      case "withdrawn":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F4F2EC] text-[#6B665E] border border-[#E8E5DC]">
            <XIcon size={13} /> Withdrawn
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#E8E5DC] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E8E5DC] flex items-start justify-between gap-4 bg-[#FAFAF7]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono uppercase text-[#8E897F]">
                Pitch ID: {request.id}
              </span>
              <span className="text-[#8E897F]">•</span>
              <span className="text-[11px] font-mono text-[#8E897F]">
                Submitted {request.createdAt}
              </span>
            </div>
            <h2 className="font-editorial text-2xl font-bold text-[#191817]">
              {request.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="terracotta" size="sm">
                {request.artForm}
              </Badge>
              {renderStatusBadge()}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8E897F] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            aria-label="Close modal"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#191817]">
          {/* Host Review Notice if present */}
          {request.reviewNote && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                request.status === "returned"
                  ? "bg-[#FAF5FF] border-[#E9D5FF] text-[#581C87]"
                  : request.status === "approved"
                  ? "bg-[#EDF5ED] border-[#CFE4CF] text-[#2D6638]"
                  : "bg-[#FDF0ED] border-[#F8D2C9] text-[#9B2C2C]"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <span>
                  {request.status === "returned"
                    ? "Feedback from Host (Changes Requested)"
                    : request.status === "approved"
                    ? "Approval Confirmation & Instructions"
                    : "Host Notice"}
                </span>
              </div>
              <p>{request.reviewNote}</p>
            </div>
          )}

          {/* Key Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F4F2EC]/50 border border-[#E8E5DC]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F] block">
                Target Stage
              </span>
              <span className="font-semibold text-xs flex items-center gap-1 mt-0.5">
                <BuildingIcon size={12} className="text-[#C85A32]" />
                {request.venueName || "General Open Call"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F] block">
                Proposed Date & Time
              </span>
              <span className="font-semibold text-xs flex items-center gap-1 mt-0.5">
                <CalendarIcon size={12} />
                {request.date} {request.time ? `(${request.time})` : ""}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F] block">
                Duration
              </span>
              <span className="font-semibold text-xs mt-0.5 block">
                {request.durationMinutes || 60} Minutes
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F] block">
                Expected Audience
              </span>
              <span className="font-semibold text-xs flex items-center gap-1 mt-0.5">
                <UsersIcon size={12} />
                ~{request.expectedAudienceSize} Patrons
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F] block">
                Production Budget
              </span>
              <span className="font-semibold text-xs text-[#2D6638] mt-0.5 block">
                {request.currency} {request.budget.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F] block">
                Preferred District
              </span>
              <span className="font-semibold text-xs flex items-center gap-1 mt-0.5">
                <MapPinIcon size={12} />
                {request.preferredLocation}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#8E897F] mb-1.5">
              Artistic Description & Concept
            </h4>
            <p className="text-xs leading-relaxed text-[#5A554D] bg-[#FAFAF7] p-3.5 rounded-xl border border-[#E8E5DC]">
              {request.description}
            </p>
          </div>

          {/* Technical Rider / Stage Requirements */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#8E897F] mb-1.5">
              Technical Rider & Stage Acoustics
            </h4>
            <p className="text-xs leading-relaxed text-[#5A554D] bg-[#FAFAF7] p-3.5 rounded-xl border border-[#E8E5DC]">
              {request.technicalRider || "Standard acoustic chamber setup without high-SPL amplification."}
            </p>
          </div>

          {/* Additional Notes */}
          {request.notes && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#8E897F] mb-1.5">
                Additional Performer Notes
              </h4>
              <p className="text-xs leading-relaxed text-[#5A554D] bg-[#FAFAF7] p-3.5 rounded-xl border border-[#E8E5DC]">
                {request.notes}
              </p>
            </div>
          )}

          {/* Status History Audit Timeline */}
          {request.statusHistory && request.statusHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#8E897F] mb-2 flex items-center gap-1.5">
                <SparklesIcon size={12} className="text-[#C85A32]" />
                <span>Pitch Audit & Lifecycle History</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {request.statusHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E8E5DC] text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#191817] capitalize">
                          {item.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F2EC] text-[#6B665E]">
                          {item.actorRole.toUpperCase()}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-[11px] text-[#5A554D] mt-0.5 leading-snug">
                          {item.note}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#8E897F] shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-[#E8E5DC] bg-[#FAFAF7] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Performer Actions */}
            {isPerformer && (
              <>
                {request.status === "returned" && onResubmit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onResubmit();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#6B21A8] hover:bg-[#7E22CE] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Resubmit Pitch →
                  </button>
                )}

                {(request.status === "pending" ||
                  request.status === "returned" ||
                  request.status === "approved") &&
                  onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEdit();
                      }}
                      className="px-4 py-2 rounded-xl bg-white border border-[#E8E5DC] hover:border-[#C85A32] text-xs font-semibold text-[#191817] transition-colors"
                    >
                      Edit Pitch Details
                    </button>
                  )}

                {(request.status === "pending" || request.status === "approved") &&
                  onWithdraw && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onWithdraw();
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                    >
                      Withdraw Pitch
                    </button>
                  )}

                {(request.status === "rejected" || request.status === "withdrawn") &&
                  onDuplicate && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onDuplicate();
                      }}
                      className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#D96B43] text-white text-xs font-semibold transition-colors"
                    >
                      Duplicate as New Pitch →
                    </button>
                  )}
              </>
            )}

            {/* Provider Actions */}
            {isProvider && request.status === "pending" && (
              <>
                {onRequestChanges && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestChanges();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#6B21A8]/40 hover:bg-[#F5F0FF] text-xs font-semibold text-[#6B21A8] transition-colors"
                  >
                    Request Changes...
                  </button>
                )}
                {onDecline && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDecline();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                  >
                    Decline
                  </button>
                )}
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onApprove();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2D6638] hover:bg-[#387C46] text-white text-xs font-semibold transition-colors"
                  >
                    Approve Pitch
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


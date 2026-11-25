"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XIcon,
  ShieldCheckIcon,
  FileTextIcon,
  CheckCircleIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { LedgerEntry } from "@/types";

interface LedgerDetailsModalProps {
  entry: LedgerEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LedgerDetailsModal({
  entry,
  isOpen,
  onClose,
}: LedgerDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !entry) return null;

  // Deterministic 70/20/10 calculations from gross proceeds
  const gross = entry.grossProceeds || 0;
  const performerShare = Math.round(gross * 0.70);
  const causeShare = Math.round(gross * 0.20);
  const platformFee = Math.round(gross * 0.10);

  // Deterministic pseudo-hash for verifiable proof
  const ledgerProofHash = `sha256_${entry.id}_${entry.causeId}_${gross}`.slice(0, 32);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#191817]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-[#FAFAF7] rounded-3xl border border-[#E8E5DC] shadow-2xl flex flex-col max-h-[92vh] z-10 overflow-hidden text-[#191817] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E5DC] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#2D6638]/10 text-[#2D6638]">
              <ShieldCheckIcon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-xl font-bold tracking-tight">
                  Settlement Record #{entry.id}
                </h2>
                <Badge variant="status" size="sm">
                  Verified Allocation
                </Badge>
              </div>
              <p className="text-xs text-[#6B665E]">
                Deterministic 70/20/10 Financial Settlement Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            aria-label="Close settlement details"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Gross Box Office */}
          <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Gross Ticket Proceeds
              </div>
              <div className="font-editorial text-2xl font-bold text-[#191817] mt-0.5">
                {entry.currency} {gross.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EDF5ED] text-[#2D6638]">
                <CheckCircleIcon size={12} /> {entry.ticketsSold} Tickets Sold
              </span>
            </div>
          </div>

          {/* Exact 70/20/10 Split Breakdown */}
          <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-[#191817] flex items-center justify-between">
              <span>Audited Partitioning</span>
              <span className="text-[10px] font-mono text-[#8E897F]">Exact Formula</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FBF0EB] border border-[#F8D2C9]">
                <div>
                  <div className="font-semibold text-[#C85A32]">70% Performer Share</div>
                  <div className="text-[10px] text-[#6B665E]">Direct artist remuneration</div>
                </div>
                <div className="font-mono font-bold text-sm text-[#C85A32]">
                  {entry.currency} {performerShare.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EDF5ED] border border-[#CFE4CF]">
                <div>
                  <div className="font-semibold text-[#2D6638]">20% Cause Pool</div>
                  <div className="text-[10px] text-[#6B665E]">{entry.causeTitle}</div>
                </div>
                <div className="font-mono font-bold text-sm text-[#2D6638]">
                  {entry.currency} {causeShare.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F2EC] border border-[#E8E5DC]">
                <div>
                  <div className="font-semibold text-[#191817]">10% Platform Fee</div>
                  <div className="text-[10px] text-[#6B665E]">Statutory compliance & operations</div>
                </div>
                <div className="font-mono font-bold text-sm text-[#191817]">
                  {entry.currency} {platformFee.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Campaign & Performance Context */}
          <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2 text-xs">
            <div className="font-semibold text-[#191817]">Event & Production Metadata</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#6B665E]">
              <div>
                <span className="text-[#8E897F]">Event: </span>
                <span className="font-medium text-[#191817]">{entry.eventTitle}</span>
              </div>
              <div>
                <span className="text-[#8E897F]">Artist: </span>
                <span className="font-medium text-[#191817]">{entry.performerName}</span>
              </div>
              <div>
                <span className="text-[#8E897F]">Space: </span>
                <span className="font-medium text-[#191817]">{entry.venueName}</span>
              </div>
              <div>
                <span className="text-[#8E897F]">Date: </span>
                <span className="font-medium text-[#191817]">{entry.date}</span>
              </div>
            </div>
          </div>

          {/* Immutable Proof & Simulation Notice */}
          <div className="p-4 bg-[#FAF4EB] border border-[#ECD9BA] rounded-2xl space-y-1.5 text-xs">
            <div className="font-semibold text-[#A66E2E] flex items-center justify-between">
              <span>Deterministic Settlement Audit</span>
              <span className="text-[10px] font-mono">Simulated Demonstration</span>
            </div>
            <p className="text-[11px] text-[#78531C] leading-relaxed">
              Amounts partitioned mathematically by STAGE backend settlement engine. The allocation is immutable and recorded with proof hash:
            </p>
            <div className="p-2 rounded bg-white/70 font-mono text-[10px] text-[#5A554D] truncate border border-[#ECD9BA]">
              Proof: {ledgerProofHash}...
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E5DC] bg-white flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}


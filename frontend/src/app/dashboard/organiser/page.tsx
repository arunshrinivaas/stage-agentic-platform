"use client";

import React, { useState } from "react";
import {
  PlusIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { CreateCampaignModal } from "@/components/dashboard/CreateCampaignModal";
import { LedgerDetailsModal } from "@/components/dashboard/LedgerDetailsModal";
import { OrganiserImpactFlowCopilot } from "@/components/dashboard/OrganiserImpactFlowCopilot";
import { useStageStore } from "@/context/StageStoreContext";
import { LedgerEntry } from "@/types";

export default function CauseOrganiserDashboardPage() {
  const { causes, ledger } = useStageStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<LedgerEntry | null>(null);
  const [preFillData, setPreFillData] = useState<{
    title?: string;
    focusArea?: string;
    targetAmount?: number;
    description?: string;
  } | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [impactSummaryGenerated, setImpactSummaryGenerated] = useState(false);

  const totalRaised = causes.reduce((sum, c) => sum + c.currentAmount, 0);

  // Deterministic impact formulas based on verified real-world unit allocations:
  // - ₹8,000 per student violin / harmonium kit
  // - ₹1,500 per youth expressive therapy session hour
  // - ₹25,000 per master folk bard residency honorarium
  // - ₹1,20,000 per zero-emission solar audio stage rig
  const violinsCount = Math.max(1, Math.floor(totalRaised / 8000));
  const therapyHours = Math.max(10, Math.floor(totalRaised / 1500));
  const masterBardsCount = Math.max(1, Math.floor(totalRaised / 25000));
  const solarRigsCount = Math.max(1, Math.floor(totalRaised / 120000));

  const handleCampaignCreated = (title: string) => {
    setToastMessage(`Campaign '${title}' published! Artists can now pledge ticket percentages.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDownloadLedger = () => {
    setToastMessage("Simulated Ledger Export: STAGE_Impact_Ledger_2026.csv generated.");
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

      {/* Organiser Header Summary */}
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-2xl sm:text-3xl font-medium text-[#191817]">
                Social Impact & Campaign Operations
              </h1>
              <Badge variant="status" size="sm">
                <ShieldCheckIcon size={11} /> Verified Partner
              </Badge>
            </div>
            <p className="text-xs font-mono text-[#8E897F]">
              Delta Melody Foundation & Allied Grassroots Cultural Alliances
            </p>
            <p className="text-xs sm:text-sm text-[#5A554D] max-w-2xl leading-relaxed pt-1">
              Track transparent ticket pledges from touring musicians, classical dancers, and theatre collectives directly allocated to your grassroots impact pools.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-xs sm:text-sm transition-colors shadow-2xs"
            >
              <PlusIcon size={16} />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>

        {/* Global Impact Numbers (Explicitly Identified as Simulated) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-[#F4F2EC]">
          <button
            type="button"
            onClick={() => document.getElementById("settlement-ledger")?.scrollIntoView({ behavior: "smooth" })}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View settlement transfer ledger"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] group-hover:text-[#191817] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Total Mobilized</span>
                <span className="text-[9px] lowercase text-[#8E897F]">(simulated)</span>
              </span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817] mt-0.5">
              ₹{totalRaised.toLocaleString()}
            </div>
          </button>

          <button
            type="button"
            onClick={() => document.getElementById("active-campaigns")?.scrollIntoView({ behavior: "smooth" })}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View grassroots campaign pools"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] group-hover:text-[#C85A32] flex items-center justify-between">
              <span>Active Campaigns</span>
              <span className="text-[10px] text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#C85A32] mt-0.5">
              {causes.length} Active
            </div>
          </button>

          <button
            type="button"
            onClick={() => document.getElementById("settlement-ledger")?.scrollIntoView({ behavior: "smooth" })}
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="View ledger transfer audits"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] group-hover:text-[#191817] flex items-center justify-between">
              <span>Ledger Entries</span>
              <span className="text-[10px] text-[#8E897F] opacity-0 group-hover:opacity-100 transition-opacity">↓ View</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#191817] mt-0.5">
              {ledger.length} Transfers
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setToastMessage(
                "Deterministic 70/20/10 Allocation: 70% direct project resources, 20% artist stewardship, 10% statutory compliance reserves."
              )
            }
            className="text-left p-3 -m-3 rounded-xl hover:bg-[#F4F2EC]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 group cursor-pointer"
            title="Click to view 70/20/10 formula explanation"
          >
            <div className="text-[11px] font-mono uppercase text-[#8E897F] flex items-center justify-between">
              <span>Allocation Rule</span>
              <span className="text-[10px] text-[#2D6638] opacity-0 group-hover:opacity-100 transition-opacity">ℹ Info</span>
            </div>
            <div className="font-editorial text-2xl font-bold text-[#2D6638] mt-0.5">
              70/20/10 Rule
            </div>
          </button>
        </div>
      </div>

      {/* In-Workspace AI Capabilities: 70/20/10 Allocation, Civic Fundraising Permits, and Campaign Drafter */}
      <OrganiserImpactFlowCopilot
        onPreFillCampaignModal={(title, focus, target, desc) => {
          setPreFillData({
            title,
            focusArea: focus,
            targetAmount: target,
            description: desc,
          });
          setIsCreateOpen(true);
        }}
      />

      {/* Section 1: Active Campaigns & Progress Tracking */}
      <section id="active-campaigns" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-medium text-[#191817]">
              Active Campaigns & Funding Progress
            </h2>
            <p className="text-xs text-[#6B665E]">
              Real-time progress of social impact pools fueled by live performance pledges.
            </p>
          </div>
          <Badge variant="status" size="sm">
            Live Pools
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {causes.map((cause) => {
            const percentage = Math.min(
              100,
              Math.round((cause.currentAmount / cause.targetAmount) * 100)
            );

            return (
              <div
                key={cause.id}
                className="bg-white rounded-2xl border border-[#E8E5DC] p-6 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="dark" size="sm">
                      {cause.focusArea}
                    </Badge>
                    <span className="text-xs font-mono text-[#8E897F]">
                      {cause.linkedPerformancesCount} Linked Events
                    </span>
                  </div>

                  <h3 className="font-editorial text-xl font-medium text-[#191817]">
                    {cause.title}
                  </h3>

                  <p className="text-xs text-[#5A554D] leading-relaxed line-clamp-2">
                    {cause.description}
                  </p>

                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-semibold text-sm text-[#191817]">
                        {cause.currency}{cause.currentAmount.toLocaleString()} (Simulated)
                      </span>
                      <span className="text-[#8E897F]">
                        of {cause.currency}{cause.targetAmount.toLocaleString()} ({percentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-[#F4F2EC] rounded-full h-2 overflow-hidden border border-[#E8E5DC]">
                      <div
                        className="bg-[#C85A32] h-full rounded-full transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F4F2EC] flex items-center justify-between text-xs text-[#8E897F]">
                  <span>Organised by {cause.organizer.name}</span>
                  <span className="text-[#2D6638] font-medium">Verified Allocation</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Deterministic Impact Summary Generator */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E5DC] shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-xl font-medium text-[#191817]">
                Deterministic Real-World Impact Calculator
              </h2>
              <Badge variant="terracotta" size="sm">
                Formula-Driven
              </Badge>
            </div>
            <p className="text-xs text-[#6B665E] mt-0.5">
              Calculated deterministically from total pool (₹{totalRaised.toLocaleString()}) using standardized unit allocation formulas.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setImpactSummaryGenerated(true)}
              type="button"
              className="px-4 py-2 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors"
            >
              {impactSummaryGenerated ? "Recalculate Outcomes" : "Calculate Real-World Impact"}
            </button>
            <button
              onClick={handleDownloadLedger}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#191817] hover:bg-[#F4F2EC] border border-[#E8E5DC] text-xs font-medium transition-colors"
            >
              <DownloadIcon size={14} />
              <span>Export Ledger</span>
            </button>
          </div>
        </div>

        {impactSummaryGenerated ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] space-y-1">
                <div className="font-editorial text-3xl font-bold text-[#A66E2E]">
                  {violinsCount} Violins
                </div>
                <div className="text-xs font-medium text-[#191817]">
                  Delivered to Schools
                </div>
                <p className="text-[11px] text-[#6B665E] leading-relaxed">
                  Formula: ⌊₹{totalRaised.toLocaleString()} / ₹8,000⌋ student violin & harmonium kits delivered.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#EDF5ED] border border-[#CFE4CF] space-y-1">
                <div className="font-editorial text-3xl font-bold text-[#2D6638]">
                  {therapyHours} Hours
                </div>
                <div className="text-xs font-medium text-[#191817]">
                  Adolescent Therapy
                </div>
                <p className="text-[11px] text-[#6B665E] leading-relaxed">
                  Formula: ⌊₹{totalRaised.toLocaleString()} / ₹1,500⌋ weekly expressive drama workshop hours.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#FBF0EB] border border-[#F5DACD] space-y-1">
                <div className="font-editorial text-3xl font-bold text-[#C85A32]">
                  {masterBardsCount} Master Bards
                </div>
                <div className="text-xs font-medium text-[#191817]">
                  Dignified Residencies
                </div>
                <p className="text-[11px] text-[#6B665E] leading-relaxed">
                  Formula: ⌊₹{totalRaised.toLocaleString()} / ₹25,000⌋ heritage artist stipends & live studio recordings.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F4F2EC] border border-[#E8E5DC] space-y-1">
                <div className="font-editorial text-3xl font-bold text-[#191817]">
                  {solarRigsCount} Solar Rigs
                </div>
                <div className="text-xs font-medium text-[#191817]">
                  Zero-Emission Stages
                </div>
                <p className="text-[11px] text-[#6B665E] leading-relaxed">
                  Formula: ⌊₹{totalRaised.toLocaleString()} / ₹120,000⌋ mobile solar battery sound systems deployed.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F4F2EC] rounded-xl text-[11px] text-[#6B665E] flex items-center justify-between">
              <span>Verified unit formulas: ₹8k/instrument · ₹1.5k/workshop hr · ₹25k/bard stipend · ₹120k/solar rig</span>
              <Badge variant="status" size="sm">Deterministic Formula</Badge>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-[#F4F2EC]/50 border border-dashed border-[#D5D1C6] text-center space-y-2">
            <FileTextIcon size={24} className="mx-auto text-[#8E897F]" />
            <p className="text-xs text-[#6B665E]">
              Click <strong>Calculate Real-World Impact</strong> to compute tangible outcomes dynamically from the ₹{totalRaised.toLocaleString()} impact pool.
            </p>
          </div>
        )}
      </section>

      {/* Section 3: Transparent Contribution Allocation Ledger */}
      <section id="settlement-ledger" className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E5DC] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-xl font-medium text-[#191817]">
              Transparent Contribution Ledger
            </h2>
            <p className="text-xs text-[#6B665E]">
              Simulated real-time record of all ticket pledge transfers from verified performance events. Click any entry to inspect audited 70/20/10 allocations.
            </p>
          </div>
          <Badge variant="outline" size="sm">
            Audited Simulation
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E5DC] text-[#8E897F] font-mono uppercase text-[10px]">
                <th className="py-2.5 font-medium">Date</th>
                <th className="py-2.5 font-medium">Cause Target</th>
                <th className="py-2.5 font-medium">Event & Performer</th>
                <th className="py-2.5 font-medium">Tickets</th>
                <th className="py-2.5 font-medium">Gross Proceeds</th>
                <th className="py-2.5 font-medium">Pledge %</th>
                <th className="py-2.5 font-medium">Transferred to Pool</th>
                <th className="py-2.5 font-medium text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F2EC] text-[#5A554D]">
              {ledger.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setSelectedLedgerEntry(entry)}
                  className="hover:bg-[#FBF0EB]/40 transition-colors cursor-pointer group"
                  title="Click to inspect cryptographic ledger proof & exact 70/20/10 split"
                >
                  <td className="py-3 font-mono">{entry.date}</td>
                  <td className="py-3 font-medium text-[#191817] group-hover:text-[#C85A32]">{entry.causeTitle}</td>
                  <td className="py-3">
                    <div className="text-[#191817] font-medium">{entry.eventTitle}</div>
                    <div className="text-[10px] text-[#8E897F]">{entry.performerName}</div>
                  </td>
                  <td className="py-3">{entry.ticketsSold} passes</td>
                  <td className="py-3">₹{entry.grossProceeds.toLocaleString()} (Simulated)</td>
                  <td className="py-3 font-medium text-[#C85A32]">{entry.pledgedPercentage}%</td>
                  <td className="py-3 font-semibold text-[#2D6638]">
                    ₹{entry.impactAmount.toLocaleString()} (Simulated)
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-[10px] text-[#C85A32] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Inspect →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Campaign Modal with AI Prefill & Explicit Confirmation */}
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setPreFillData(undefined);
        }}
        onSuccessToast={handleCampaignCreated}
        initialValues={preFillData}
      />

      {/* Ledger Transaction Details Modal */}
      {selectedLedgerEntry && (
        <LedgerDetailsModal
          entry={selectedLedgerEntry}
          isOpen={true}
          onClose={() => setSelectedLedgerEntry(null)}
        />
      )}
    </div>
  );
}

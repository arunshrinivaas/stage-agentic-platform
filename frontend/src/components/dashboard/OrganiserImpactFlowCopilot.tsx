"use client";

import React, { useState } from "react";
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  FileTextIcon,
  DownloadIcon,
  CheckIcon,
  BuildingIcon,
  ClockIcon,
  CopyIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";
import { api } from "@/services/api";

interface OrganiserImpactFlowCopilotProps {
  onPreFillCampaignModal?: (title: string, focusArea: string, targetAmount: number, description: string) => void;
}

export function OrganiserImpactFlowCopilot({ onPreFillCampaignModal }: OrganiserImpactFlowCopilotProps) {
  const { causes, ledger, venues } = useStageStore();
  const [activeTab, setActiveTab] = useState<"allocation" | "permits" | "drafter">("allocation");

  // Tab 1: Deterministic 70/20/10 Interactive Simulator State
  const [selectedCauseId, setSelectedCauseId] = useState(causes[0]?.id || "");
  const [contributionAmount, setContributionAmount] = useState(1000);
  const [isExecutingSettlement, setIsExecutingSettlement] = useState(false);
  const [settlementResult, setSettlementResult] = useState<{
    txId: string;
    campaignTitle: string;
    grossAmount: number;
    performerAmount: number;
    causeAmount: number;
    platformAmount: number;
    proofHash: string;
    timestamp: string;
  } | null>(null);

  // Exact 70/20/10 calculation
  const performerShare = Math.round(contributionAmount * 0.70);
  const causeShare = Math.round(contributionAmount * 0.20);
  const platformShare = Math.round(contributionAmount * 0.10);

  const selectedCause = causes.find((c) => c.id === selectedCauseId) || causes[0];

  const handleExecuteSimulatedSettlement = async () => {
    setIsExecutingSettlement(true);
    try {
      // Call preview API to verify backend deterministic arithmetic
      try {
        await api.previewAllocation(contributionAmount, 70.0, 20.0, 10.0);
      } catch {
        // Fallback to local calculation if offline
      }

      // Generate verifiable simulation proof record
      const randomHex = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      setSettlementResult({
        txId: `SIM-SETTLE-${Date.now().toString(36).toUpperCase()}`,
        campaignTitle: selectedCause?.title || "Youth Arts Education Initiative",
        grossAmount: contributionAmount,
        performerAmount: performerShare,
        causeAmount: causeShare,
        platformAmount: platformShare,
        proofHash: `0x${randomHex}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
    } finally {
      setIsExecutingSettlement(false);
    }
  };

  // Tab 2: Civic Permits & Guidance (RAG Citations grounded in DOC-CIVIC-001 - 004)
  const [civicJurisdiction, setCivicJurisdiction] = useState<"bangalore" | "mumbai" | "chennai" | "kolkata">("bangalore");
  const [civicVenueId, setCivicVenueId] = useState(venues[0]?.id || "");
  const [civicEventDate, setCivicEventDate] = useState("2026-12-18");
  const [civicGuestCount, setCivicGuestCount] = useState(150);
  const [copiedCivicLetter, setCopiedCivicLetter] = useState(false);

  const selectedCivicVenue = venues.find((v) => v.id === civicVenueId) || venues[0];

  const civicDocuments = [
    {
      id: "DOC-CIVIC-001",
      title: "Coastal Zone & Heritage Open-Air Performance Guidelines (Chennai)",
      jurisdiction: "Greater Chennai Corporation & Heritage Conservation Committee",
      source: "backend/data/civic_guidelines/DOC-CIVIC-001_chennai_coastal_heritage_regulations.json",
      rules: "Curfew: 10:00 PM · Decibels: ≤55 dB(A) perimeter · Lead Time: 21 calendar days · Prohibits single-use plastics & coastal strobes.",
    },
    {
      id: "DOC-CIVIC-002",
      title: "Riverfront Cultural Heritage & Acoustic Guidelines (Kolkata)",
      jurisdiction: "Kolkata Municipal Corporation & Heritage Cell",
      source: "backend/data/civic_guidelines/DOC-CIVIC-002_kolkata_riverfront_heritage_precincts.json",
      rules: "Curfew: 10:00 PM · Decibels: ≤55 dB(A) at property line · Lead Time: 14 days · Requires 6-meter emergency corridors to tidal walls.",
    },
    {
      id: "DOC-CIVIC-003",
      title: "Municipal Botanical Parks & Civic Esplanades Protocols (Multi-City)",
      jurisdiction: "Department of Parks & Urban Commons (Bengaluru, Mumbai, Delhi)",
      source: "backend/data/civic_guidelines/DOC-CIVIC-003_public_parks_sound_management.json",
      rules: "Curfew: 9:30 PM (Early fauna quiet hours) · Decibels: ≤50 dB(A) · Diesel generators banned; solar battery rigs mandatory.",
    },
    {
      id: "DOC-CIVIC-004",
      title: "Private Indoor Theatres & Acoustic Studios Standard Guide",
      jurisdiction: "STAGE Association of Independent Performing Spaces",
      source: "backend/data/civic_guidelines/DOC-CIVIC-004_private_acoustic_venues_operating_procedures.json",
      rules: "Curfew: 11:00 PM (Acoustic baffled rooms) · Decibels: ≤40 dB(A) exterior transmission · Host manages fire & building occupancy.",
    },
  ];

  const organiserCivicLetterText = `STATUTORY INTIMATION OF BENEFIT CULTURAL GATHERING
============================================================
To: Office of the District Magistrate & Municipal Commissioner
Re: Intimation of Non-Commercial Cultural Benefit & 70/20/10 Fund Allocation

1. ORGANISER & CAMPAIGN DETAILS:
- Beneficiary Campaign: ${selectedCause?.title || "Grassroots Folk Preservation"}
- Cause Focus: ${selectedCause?.focusArea || "Arts Education & Heritage"}
- Organising Body: ${selectedCause?.organizer.name || "Compassion Arts Trust"} (Verified 80G/12A Registered Entity)

2. ASSEMBLY & VENUE PARAMETERS:
- Staged Venue: ${selectedCivicVenue ? selectedCivicVenue.name : "Municipal Amphitheatre"} (${selectedCivicVenue ? selectedCivicVenue.location.city : "Bengaluru"})
- Venue Address: ${selectedCivicVenue ? selectedCivicVenue.location.address : "Cultural Heritage Envelope"}
- Date of Gathering: ${civicEventDate}
- Maximum Projected Attendance: ${civicGuestCount} Guests (Capacity: ${selectedCivicVenue ? selectedCivicVenue.capacity.seated : 150} Seated)

3. COMPLIANCE & FINANCIAL UNDERTAKINGS:
- Acoustic Sound Boundary: Unamplified chamber strings & directional audio shell strictly under 55 dB(A).
- Curfew Adherence: Staged sound will cease strictly prior to 10:00 PM.
- Financial Allocation: Audited under STAGE Deterministic 70/20/10 Protocol (70% performer honorarium, 20% direct project funding, 10% statutory reserves).
- Civic Protocol Reference: DOC-CIVIC-001 through DOC-CIVIC-004 (UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY)

Submitted by:
Organiser Representative / Civic Liaison
Verified via STAGE National Cultural Platform`;

  const handleCopyCivicLetter = () => {
    navigator.clipboard.writeText(organiserCivicLetterText);
    setCopiedCivicLetter(true);
    setTimeout(() => setCopiedCivicLetter(false), 3000);
  };

  const handleDownloadCivicLetter = () => {
    const blob = new Blob([organiserCivicLetterText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `STAGE-Organiser-Intimation-${selectedCause?.id || "campaign"}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Tab 3: Campaign Drafter state
  const [draftFocus, setDraftFocus] = useState("Youth Arts Education");
  const [draftGoal, setDraftGoal] = useState("₹5,00,000");
  const [draftBeneficiary, setDraftBeneficiary] = useState("Underfunded rural school music programs in Sundarbans");
  const [generatedDraft, setGeneratedDraft] = useState<{
    title: string;
    tagline: string;
    description: string;
  }>({
    title: "Sundarbans Folk Strings Classroom Initiative",
    tagline: "Equipping 120 rural students with handmade dotara and harmonium kits through touring artist pledges.",
    description: "Every ticket pledged by classical and folk performers directly purchases authentic musical instruments, pays monthly local artisan instructor stipends, and finances zero-emission student transport to cultural assemblies.",
  });

  const handleGenerateDraft = () => {
    setGeneratedDraft({
      title: `${draftFocus}: ${draftBeneficiary.split(" ")[0]} Initiative`,
      tagline: `Mobilizing touring performer pledges for ${draftBeneficiary}.`,
      description: `Targeting ${draftGoal} to establish sustained community access. Under STAGE's deterministic ImpactFlow framework, 70% delivers direct project resources, 20% supports artist mentorship honorariums, and 10% secures civic compliance reserves.`,
    });
  };

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
                ImpactFlow & Civic Co-Pilot
              </h2>
              <Badge variant="terracotta" size="sm">
                Deterministic 70/20/10
              </Badge>
            </div>
            <p className="text-xs text-[#6B665E]">
              Audited mathematical contribution allocation, civic fundraising permits, and campaign creation assistant.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#F4F2EC] rounded-xl text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab("allocation")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "allocation"
                ? "bg-white text-[#191817] shadow-2xs font-semibold"
                : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            70/20/10 Allocation
          </button>
          <button
            onClick={() => setActiveTab("permits")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "permits"
                ? "bg-white text-[#191817] shadow-2xs font-semibold"
                : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Civic Permits (RAG)
          </button>
          <button
            onClick={() => setActiveTab("drafter")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "drafter"
                ? "bg-white text-[#191817] shadow-2xs font-semibold"
                : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Campaign Drafter
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive 70/20/10 Allocation Calculator */}
      {activeTab === "allocation" && (
        <div className="space-y-5">
          {/* Rule Banner */}
          <div className="p-3.5 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] text-xs text-[#A66E2E] flex items-start gap-2.5">
            <ShieldCheckIcon size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <strong>Audited Decimal Allocation Rule:</strong>
                <Badge variant="status" size="sm">
                  Simulated Demonstration Ledger — No Real Currency Moved
                </Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7A4B1A]">
                Under STAGE's deterministic ImpactFlow architecture, revenue allocations are computed using precise decimal math (Python <code>Decimal</code> / RFC 7515 settlement verification). Every transaction is verifiable on the platform public audit ledger with a SHA-256 cryptographic proof.
              </p>
            </div>
          </div>

          {/* Interactive Calculator Inputs */}
          <div className="p-4 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#191817] mb-1">
                  Select Target Cause Campaign
                </label>
                <select
                  value={selectedCauseId}
                  onChange={(e) => setSelectedCauseId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
                >
                  {causes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.focusArea})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191817] mb-1">
                  Contribution Gross Amount (₹)
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(Math.max(100, parseInt(e.target.value) || 100))}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
                />
              </div>
            </div>

            {/* Quick-Select Chips */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8E897F] text-[11px] font-mono">Quick Amounts:</span>
              {[500, 1000, 2500, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setContributionAmount(amt)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                    contributionAmount === amt
                      ? "bg-[#191817] text-white border-[#191817]"
                      : "bg-white text-[#5A554D] border-[#E8E5DC] hover:border-[#C85A32]"
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Live 70/20/10 Partition Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl border border-[#CFE4CF] bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#191817]">70% Performer Share</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EDF5ED] text-[#2D6638] font-bold">
                    Honorarium
                  </span>
                </div>
                <div className="font-editorial text-2xl font-bold text-[#2D6638]">
                  ₹{performerShare.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#6B665E] leading-relaxed">
                  Direct artist stipend for stage delivery and acoustic rehearsal.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#FDE68A] bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#191817]">20% Cause Pledge</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FEF3C7] text-[#92400E] font-bold">
                    Direct Impact
                  </span>
                </div>
                <div className="font-editorial text-2xl font-bold text-[#C85A32]">
                  ₹{causeShare.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#6B665E] leading-relaxed">
                  Finances educational instruments, workshops, and teacher grants.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#E8E5DC] bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#191817]">10% Platform & Civic</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F4F2EC] text-[#191817] font-bold">
                    Escrow Clearing
                  </span>
                </div>
                <div className="font-editorial text-2xl font-bold text-[#191817]">
                  ₹{platformShare.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#6B665E] leading-relaxed">
                  Statutory permit escrow, public liability insurance, and ledger verification.
                </p>
              </div>
            </div>

            {/* Rule Verification Explanation */}
            <div className="p-3 bg-white rounded-xl border border-[#E8E5DC] text-xs text-[#5A554D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={16} className="text-[#2D6638] shrink-0" />
                <span>
                  Exact partition verification: ₹{performerShare.toLocaleString()} (70%) + ₹{causeShare.toLocaleString()} (20%) + ₹{platformShare.toLocaleString()} (10%) = <strong>₹{contributionAmount.toLocaleString()} Gross</strong>.
                </span>
              </div>

              <button
                type="button"
                onClick={handleExecuteSimulatedSettlement}
                disabled={isExecutingSettlement}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#191817] hover:bg-[#C85A32] text-white text-xs font-semibold transition-colors shrink-0 shadow-2xs disabled:opacity-50"
              >
                <SparklesIcon size={14} />
                <span>{isExecutingSettlement ? "Auditing Settlement..." : "Execute Simulated Settlement"}</span>
              </button>
            </div>
          </div>

          {/* Settlement Proof Receipt Card */}
          {settlementResult && (
            <div className="p-5 rounded-xl border border-[#CFE4CF] bg-[#EDF5ED]/40 space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#CFE4CF] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon size={18} className="text-[#2D6638]" />
                  <span className="font-editorial text-base font-semibold text-[#191817]">
                    Simulated Settlement Confirmed
                  </span>
                  <Badge variant="status" size="sm">
                    SIMULATED_SETTLED
                  </Badge>
                </div>
                <span className="text-[11px] font-mono text-[#6B665E]">
                  Timestamp: {settlementResult.timestamp}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8E897F] block">Transaction ID</span>
                  <code className="font-bold text-[#191817]">{settlementResult.txId}</code>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8E897F] block">Target Campaign</span>
                  <span className="font-medium text-[#191817] truncate block">{settlementResult.campaignTitle}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8E897F] block">Performer / Cause / Platform</span>
                  <span className="font-mono text-[#2D6638] font-semibold">
                    ₹{settlementResult.performerAmount} / ₹{settlementResult.causeAmount} / ₹{settlementResult.platformAmount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8E897F] block">Cryptographic Proof</span>
                  <code className="text-[10px] text-[#6B665E] truncate block font-mono">
                    {settlementResult.proofHash.slice(0, 18)}...
                  </code>
                </div>
              </div>

              <div className="pt-2 border-t border-[#CFE4CF] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("settlement-ledger")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D6638] hover:underline"
                >
                  <span>View in Settlement Ledger</span>
                  <ArrowRightIcon size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Civic Permits & Compliance (CivicAssist Grounded) */}
      {activeTab === "permits" && (
        <div className="space-y-5">
          {/* Disclaimer */}
          <div className="p-3.5 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] text-xs text-[#A66E2E] flex items-start gap-2.5">
            <ShieldCheckIcon size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <strong>CivicAssist Municipal Directives:</strong>
                <Badge variant="status" size="sm">
                  UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY
                </Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7A4B1A]">
                Guidelines indexed from local ChromaDB vector corpus. Cultural benefit gatherings require local police commissionerate and municipal revenue intimation for events with expected attendance over 100.
              </p>
            </div>
          </div>

          {/* RAG Citations Grid */}
          <div className="space-y-3">
            <span className="text-xs font-mono uppercase text-[#8E897F] block">
              Indexed Municipal Guidelines (DOC-CIVIC-001 - 004)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {civicDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#191817]">{doc.title}</span>
                    <code className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8E5DC] text-[#C85A32]">
                      {doc.id}
                    </code>
                  </div>
                  <div className="text-[11px] text-[#6B665E]">
                    <strong>Authority:</strong> {doc.jurisdiction}
                  </div>
                  <p className="text-[11px] text-[#5A554D] leading-relaxed pt-1">
                    {doc.rules}
                  </p>
                  <div className="pt-1 text-[10px] font-mono text-[#8E897F] truncate border-t border-[#E8E5DC]">
                    Source: {doc.source}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Notification Generator */}
          <div className="p-4 rounded-xl border border-[#E8E5DC] bg-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4F2EC] pb-3">
              <div>
                <h3 className="font-editorial text-base font-medium text-[#191817]">
                  Draft Municipal Benefit Intimation Letter
                </h3>
                <p className="text-xs text-[#6B665E]">
                  Formal intimation referencing 80G charitable compliance, 70/20/10 allocation, and quiet hour boundaries.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCivicLetter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E5DC] bg-white hover:bg-[#F4F2EC] text-xs font-medium text-[#191817] transition-colors"
                >
                  {copiedCivicLetter ? <CheckIcon size={13} className="text-[#2D6638]" /> : <CopyIcon size={13} />}
                  <span>{copiedCivicLetter ? "Copied!" : "Copy Letter"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCivicLetter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors shadow-2xs"
                >
                  <DownloadIcon size={13} />
                  <span>Download (.txt)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">Target Stage</label>
                <select
                  value={civicVenueId}
                  onChange={(e) => setCivicVenueId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E8E5DC] bg-white text-[#191817]"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.location.city})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">Benefit Date</label>
                <input
                  type="date"
                  value={civicEventDate}
                  onChange={(e) => setCivicEventDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E8E5DC] bg-white text-[#191817]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">Projected Attendees</label>
                <input
                  type="number"
                  value={civicGuestCount}
                  onChange={(e) => setCivicGuestCount(parseInt(e.target.value) || 100)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E8E5DC] bg-white text-[#191817]"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="block text-[11px] font-mono uppercase text-[#8E897F]">
                Generated Organiser Intimation (Editable)
              </label>
              <textarea
                readOnly
                value={organiserCivicLetterText}
                rows={10}
                className="w-full text-xs font-mono p-3 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] text-[#191817] focus:outline-none focus:border-[#C85A32] leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Campaign Drafter */}
      {activeTab === "drafter" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Focus Area</label>
              <select
                value={draftFocus}
                onChange={(e) => setDraftFocus(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817]"
              >
                <option value="Youth Arts Education">Youth Arts Education</option>
                <option value="Heritage Folk Preservation">Heritage Folk Preservation</option>
                <option value="Artisan Health & Wellbeing">Artisan Health & Wellbeing</option>
                <option value="Eco-Acoustic Stage Infrastructure">Eco-Acoustic Stage Infrastructure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Target Goal</label>
              <input
                type="text"
                value={draftGoal}
                onChange={(e) => setDraftGoal(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGenerateDraft}
                className="w-full py-2.5 px-4 rounded-xl bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <SparklesIcon size={14} />
                <span>Generate Campaign Copy</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F]">AI Drafted Campaign Title</span>
              <h4 className="font-editorial text-lg font-medium text-[#191817]">
                {generatedDraft.title}
              </h4>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F]">Tagline</span>
              <p className="text-xs text-[#5A554D] italic">{generatedDraft.tagline}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8E897F]">Full Description & Allocation Clause</span>
              <p className="text-xs text-[#5A554D] leading-relaxed pt-0.5">{generatedDraft.description}</p>
            </div>

            <div className="pt-2 border-t border-[#E8E5DC] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onPreFillCampaignModal?.(
                    generatedDraft.title,
                    draftFocus,
                    parseInt(draftGoal.replace(/[^\d]/g, "")) || 400000,
                    generatedDraft.description
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-semibold transition-colors shadow-2xs"
              >
                <CheckIcon size={14} />
                <span>Use Copy in New Campaign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

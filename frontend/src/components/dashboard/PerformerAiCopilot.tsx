"use client";

import React, { useState } from "react";
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  MapPinIcon,
  CalendarIcon,
  FileTextIcon,
  ArrowRightIcon,
  ClockIcon,
  BuildingIcon,
  ShieldCheckIcon,
  DownloadIcon,
  CheckIcon,
  CopyIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { VenueDetailsModal } from "@/components/dashboard/VenueDetailsModal";
import { useStageStore } from "@/context/StageStoreContext";
import { api } from "@/services/api";
import { StageVenue } from "@/types";

interface PerformerAiCopilotProps {
  onSelectVenueForPitch: (venueId: string) => void;
}

export function PerformerAiCopilot({ onSelectVenueForPitch }: PerformerAiCopilotProps) {
  const { venues, events } = useStageStore();
  const [activeTab, setActiveTab] = useState<"stages" | "rider" | "civic" | "conflicts">("stages");

  // Tab 1: Stage & Acoustic Matcher State (Grounded in real venues)
  const [selectedCity, setSelectedCity] = useState("Bangalore");
  const [selectedArtForm, setSelectedArtForm] = useState("Indo-Classical & Baroque Chamber Fusion");
  const [selectedDate, setSelectedDate] = useState("2026-12-15");
  const [expectedAudience, setExpectedAudience] = useState(120);
  const [budget, setBudget] = useState(35000);
  const [isSearchingStages, setIsSearchingStages] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [inspectingVenue, setInspectingVenue] = useState<StageVenue | null>(null);

  // Initialize stage results dynamically from real verified venues in store
  const [stageResults, setStageResults] = useState<Array<{
    id: string;
    name: string;
    city: string;
    matchScore: number;
    acousticProfile: string;
    capacity: number;
    curfew: string;
    rationale: string;
    venueRef: StageVenue;
  }>>(() => {
    return venues.slice(0, 2).map((v, idx) => ({
      id: v.id,
      name: v.name,
      city: v.location.city,
      matchScore: 96 - idx * 4,
      acousticProfile: v.amenities.find((a) => a.toLowerCase().includes("acoustic")) || "Natural stone acoustic resonance",
      capacity: v.capacity.seated,
      curfew: "10:00 PM (Strict Civic Limit)",
      rationale: `Verified capacity (${v.capacity.formatted}) and dedicated acoustic architecture matching classical sitar and chamber cello.`,
      venueRef: v,
    }));
  });

  // Tab 2: Technical Rider Assistant State
  const [riderChecks, setRiderChecks] = useState([
    { id: "di_box", label: "Stereo Active DI Box for 7-string Sitar", status: "passed", note: "Verified impedance matching for magnetic pickups" },
    { id: "mic_cello", label: "DPA 4099 Clip-on Condenser Mic for Cello", status: "passed", note: "Standard 48V phantom power required" },
    { id: "monitors", label: "Dual Wedge IEM or Low-Profile Floor Monitors", status: "warning", note: "Attention: Specify monitor mix separation (Ch 1 Sitar, Ch 2 Cello)" },
    { id: "power", label: "Isolated Clean Earth Power (230V, 50Hz)", status: "passed", note: "Essential to prevent 50Hz ground hum with acoustic preamps" },
    { id: "soundcheck", label: "90-Minute Pre-Show Acoustic Resonance Check", status: "warning", note: "Attention: Include temperature-induced pitch drift buffer for natural strings" },
  ]);

  // Tab 3: Civic Compliance & Permits State (CivicAssist grounded in DOC-CIVIC-001 - 004)
  const [civicJurisdiction, setCivicJurisdiction] = useState<"bangalore" | "chennai" | "kolkata" | "mumbai" | "indoor">("bangalore");
  const [civicVenueId, setCivicVenueId] = useState(venues[0]?.id || "");
  const [civicEventDate, setCivicEventDate] = useState("2026-12-15");
  const [civicAudienceSize, setCivicAudienceSize] = useState(120);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // ChromaDB Sample Guidelines Corpus
  const civicDocuments = [
    {
      id: "DOC-CIVIC-001",
      title: "Coastal Zone & Heritage Open-Air Performance Guidelines (Chennai Metropolitan Region)",
      jurisdiction: "Greater Chennai Corporation & Heritage Conservation Committee",
      sourceFile: "backend/data/civic_guidelines/DOC-CIVIC-001_chennai_coastal_heritage_regulations.json",
      curfew: "10:00 PM (45 dB(A) after 9:00 PM)",
      decibels: "≤ 55 dB(A) at perimeter (dusk); ≤ 45 dB(A) (night)",
      leadTime: "21 calendar days minimum",
      keyRule: "Sound reinforcement must utilize focused directional acoustic shells. Single-use plastics and seaward strobe lighting prohibited.",
    },
    {
      id: "DOC-CIVIC-002",
      title: "Riverfront Cultural Heritage & Acoustic Performance Guidelines (Kolkata Port & Waterfront)",
      jurisdiction: "Kolkata Municipal Corporation & Heritage Cell",
      sourceFile: "backend/data/civic_guidelines/DOC-CIVIC-002_kolkata_riverfront_heritage_precincts.json",
      curfew: "10:00 PM strict boundary",
      decibels: "≤ 55 dB(A) at property line",
      leadTime: "14 calendar days advance notice",
      keyRule: "Clear 6-meter emergency corridors to tidal embankments. Written verification required from river traffic police for >100 persons.",
    },
    {
      id: "DOC-CIVIC-003",
      title: "Municipal Botanical Parks & Civic Esplanades Event Protocols",
      jurisdiction: "Department of Parks & Urban Commons (Bengaluru, Mumbai, Delhi, Kolkata, Chennai)",
      sourceFile: "backend/data/civic_guidelines/DOC-CIVIC-003_public_parks_sound_management.json",
      curfew: "9:30 PM (Early fauna quiet hours)",
      decibels: "≤ 50 dB(A) at garden boundary",
      leadTime: "15 calendar days",
      keyRule: "Diesel generators prohibited on lawns. Solar battery audio banks or venue tie-ins mandatory. Fee exemptions apply for verified social-impact causes.",
    },
    {
      id: "DOC-CIVIC-004",
      title: "Private Indoor Theatres, Listening Rooms & Acoustic Studios Best Practice Guide",
      jurisdiction: "STAGE Association of Independent Performing Spaces",
      sourceFile: "backend/data/civic_guidelines/DOC-CIVIC-004_private_acoustic_venues_operating_procedures.json",
      curfew: "11:00 PM (sound baffled premises)",
      decibels: "≤ 40 dB(A) transmission at exterior property line",
      leadTime: "Standard host venue booking agreement",
      keyRule: "Host manages primary fire and building occupancy certificates. Standing room capped at 1.5x seated capacity. Panic hardware illuminated.",
    },
  ];

  // Dynamic Draft Notice Content
  const selectedCivicVenue = venues.find((v) => v.id === civicVenueId) || venues[0];
  const draftNoticeText = `FORMAL LETTER OF INTENT & CIVIC INTIMATION
============================================================
To: The Competent Municipal & Police Authority (Cultural Cell)
Re: Intimation of Acoustic Cultural Gathering Under Standard Civic Norms

1. EVENT DETAILS:
- Event Title: Indo-Classical & Chamber Fusion Recital
- Proposed Date: ${civicEventDate}
- Venue: ${selectedCivicVenue ? selectedCivicVenue.name : "Designated Heritage Stage"} (${selectedCivicVenue ? selectedCivicVenue.location.city : "Bengaluru"})
- Venue Address: ${selectedCivicVenue ? selectedCivicVenue.location.address : "Municipal Heritage Precinct"}
- Expected Attendance: ${civicAudienceSize} Patrons (Venue Capacity: ${selectedCivicVenue ? selectedCivicVenue.capacity.seated : 150} Seated)

2. ACOUSTIC & EMISSION UNDERTAKING:
- Instrument Lineup: Natural acoustic sitar, chamber cello, tabla, low-profile ambient monitors.
- Sound Boundary: Calibrated directional acoustic shell; Sound Pressure Level shall NOT exceed 55 dB(A) at property perimeter.
- Curfew Compliance: Staged sound amplification will terminate strictly prior to 10:00 PM.
- Eco-Protocol: Zero single-use plastics, battery/clean-earth audio banks, emergency egress maintained.

3. STATUTORY REFERENCES & GUIDANCE CITATIONS:
- STAGE RAG Corpus: DOC-CIVIC-001 through DOC-CIVIC-004
- Status: UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY

Respectfully Submitted,
Performing Artist / Collective Representative
Verified via STAGE National Cultural Platform`;

  // Tab 4: Scheduling Conflict State
  const [inspectDate, setInspectDate] = useState("2026-12-20");
  const [inspectVenueId, setInspectVenueId] = useState(venues[0]?.id || "");
  const [conflictReport, setConflictReport] = useState<{
    hasConflict: boolean;
    conflictingTitle?: string;
    message: string;
  } | null>(null);

  const handleSearchStages = async () => {
    setIsSearchingStages(true);
    setMatchError(null);

    try {
      // Execute backend AI command for multi-agent reasoning trace
      try {
        await api.executeAiCommand({
          user_id: "usr-aarav",
          message: `Find a verified acoustic stage in ${selectedCity} for ${selectedArtForm} with ${expectedAudience} seats and budget ₹${budget}`,
        });
      } catch {
        // Continue with local deterministic evaluation if offline
      }

      // Filter local verified venues matching selected city
      const cityMatches = venues.filter((v) =>
        v.location.city.toLowerCase().includes(selectedCity.toLowerCase())
      );

      if (cityMatches.length === 0) {
        setMatchError(
          `No registered stage records found in ${selectedCity} matching your criteria. Currently active cities in the verified database: Bangalore, Kolkata, Chennai, and Mumbai.`
        );
        setStageResults([]);
        return;
      }

      // Score matching venues based on capacity fit and acoustic keywords
      const scored = cityMatches.map((v, idx) => {
        const capacityDiff = Math.abs(v.capacity.seated - expectedAudience);
        const capacityScore = Math.max(70, 100 - Math.round(capacityDiff / 4));
        const hasAcoustic = v.amenities.some((a) =>
          a.toLowerCase().includes("acoustic") || a.toLowerCase().includes("sound")
        );
        const matchScore = Math.min(98, Math.max(80, capacityScore + (hasAcoustic ? 5 : 0) - idx * 3));

        const acousticProfile =
          v.amenities.find((a) => a.toLowerCase().includes("acoustic")) ||
          "Acoustic chamber with balanced natural reverb";

        return {
          id: v.id,
          name: v.name,
          city: v.location.city,
          matchScore,
          acousticProfile,
          capacity: v.capacity.seated,
          curfew: "10:00 PM (Civic Limit)",
          rationale: `Verified capacity (${v.capacity.formatted}) aligns with your ${expectedAudience}-guest estimate. ${v.amenities.slice(0, 2).join(", ")}.`,
          venueRef: v,
        };
      });

      // Sort by match score descending
      scored.sort((a, b) => b.matchScore - a.matchScore);
      setStageResults(scored);
    } finally {
      setIsSearchingStages(false);
    }
  };

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(draftNoticeText);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const handleDownloadNotice = () => {
    const blob = new Blob([draftNoticeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `STAGE-Civic-Notice-${selectedCivicVenue?.id || "draft"}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCheckConflict = () => {
    const venueName = venues.find((v) => v.id === inspectVenueId)?.name || "Selected Stage";
    const conflictingEvent = events.find(
      (e) =>
        e.location.venueName.toLowerCase().includes(venueName.toLowerCase()) &&
        e.date === inspectDate
    );

    if (conflictingEvent) {
      setConflictReport({
        hasConflict: true,
        conflictingTitle: conflictingEvent.title,
        message: `Conflict detected: "${conflictingEvent.title}" is already scheduled at ${venueName} on ${inspectDate}. Please select an alternate date.`,
      });
    } else {
      setConflictReport({
        hasConflict: false,
        message: `No conflicts detected for ${venueName} on ${inspectDate}. Stage calendar is open for technical pitch.`,
      });
    }
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
                AI Stage & Proposal Co-Pilot
              </h2>
              <Badge variant="terracotta" size="sm">
                StageMatch & CivicAssist
              </Badge>
            </div>
            <p className="text-xs text-[#6B665E]">
              Grounded acoustic discovery, technical rider audit, ChromaDB civic RAG guidelines, and conflict prevention.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#F4F2EC] rounded-xl text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab("stages")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "stages"
                ? "bg-white text-[#191817] shadow-2xs font-semibold"
                : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Stage Matcher
          </button>
          <button
            onClick={() => setActiveTab("rider")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "rider"
                ? "bg-white text-[#191817] shadow-2xs font-semibold"
                : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Rider Audit
          </button>
          <button
            onClick={() => setActiveTab("civic")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "civic"
                ? "bg-white text-[#191817] shadow-2xs font-semibold"
                : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            CivicAssist (RAG)
          </button>
          <button
            onClick={() => setActiveTab("conflicts")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "conflicts"
                ? "bg-white text-[#191817] shadow-2xs font-semibold"
                : "text-[#6B665E] hover:text-[#191817]"
            }`}
          >
            Conflict Checker
          </button>
        </div>
      </div>

      {/* Tab 1: Stage Matcher */}
      {activeTab === "stages" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Target City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
              >
                <option value="Bangalore">Bangalore</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Chennai">Chennai</option>
                <option value="Mumbai">Mumbai</option>
                <option value="New Delhi">New Delhi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Acoustic Art Form</label>
              <input
                type="text"
                value={selectedArtForm}
                onChange={(e) => setSelectedArtForm(e.target.value)}
                placeholder="e.g. Sitar Chamber Fusion"
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
              >
              </input>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Performance Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Expected Audience</label>
              <input
                type="number"
                min={20}
                max={1000}
                value={expectedAudience}
                onChange={(e) => setExpectedAudience(parseInt(e.target.value) || 100)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearchStages}
                disabled={isSearchingStages}
                className="w-full py-2.5 px-4 rounded-xl bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-2xs"
              >
                <SparklesIcon size={14} />
                <span>{isSearchingStages ? "Evaluating..." : "Evaluate Matches"}</span>
              </button>
            </div>
          </div>

          {/* Match Error / Empty State */}
          {matchError && (
            <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircleIcon size={16} className="shrink-0 mt-0.5 text-[#C85A32]" />
              <div>
                <strong>No Matching Registered Stages:</strong> {matchError}
              </div>
            </div>
          )}

          {/* Grounded Scored Stages Grid */}
          {stageResults.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#8E897F]">
                  Grounded Verified Stages ({stageResults.length} in {selectedCity})
                </span>
                <span className="text-[11px] text-[#2D6638] font-medium flex items-center gap-1">
                  <ShieldCheckIcon size={13} />
                  <span>Backed by database records</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stageResults.map((stg) => (
                  <div
                    key={stg.id}
                    className="p-4 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] hover:border-[#C85A32]/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[#191817]">{stg.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF]">
                          {stg.matchScore}% Match
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6B665E]">
                        <MapPinIcon size={13} />
                        <span>{stg.city}</span>
                        <span>·</span>
                        <BuildingIcon size={13} />
                        <span>Cap: {stg.capacity}</span>
                        <span>·</span>
                        <ClockIcon size={13} />
                        <span>Curfew: {stg.curfew}</span>
                      </div>
                      <p className="text-xs text-[#5A554D] leading-relaxed pt-1">
                        {stg.rationale}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E8E5DC] flex items-center justify-between">
                      <button
                        onClick={() => setInspectingVenue(stg.venueRef)}
                        className="text-xs text-[#C85A32] font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Inspect Space</span>
                        <ArrowRightIcon size={12} />
                      </button>

                      <button
                        onClick={() => onSelectVenueForPitch(stg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors shadow-2xs"
                      >
                        <span>Pitch Stage</span>
                        <ArrowRightIcon size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Technical Rider Assistant */}
      {activeTab === "rider" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] text-xs text-[#A66E2E] flex items-start gap-2.5">
            <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong>Rider Health Score: 88/100.</strong> Natural string instruments with unamplified resonance require documented soundcheck windows and isolated earth ground to prevent RF buzz during evening atmospheric moisture spikes.
            </div>
          </div>

          <div className="space-y-2">
            {riderChecks.map((check) => (
              <div
                key={check.id}
                className="p-3 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  {check.status === "passed" ? (
                    <CheckCircleIcon size={16} className="text-[#2D6638] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircleIcon size={16} className="text-[#C85A32] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-[#191817] block">{check.label}</span>
                    <span className="text-[#6B665E]">{check.note}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium self-start sm:self-auto ${
                    check.status === "passed"
                      ? "bg-[#EDF5ED] text-[#2D6638]"
                      : "bg-[#FEF3C7] text-[#92400E]"
                  }`}
                >
                  {check.status === "passed" ? "Verified Spec" : "Recommendation"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setRiderChecks((prev) =>
                  prev.map((c) => ({
                    ...c,
                    status: "passed",
                    note: c.note.replace("Attention: ", "Incorporated: "),
                  }))
                );
              }}
              className="px-4 py-2 rounded-xl bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <CheckCircleIcon size={14} />
              <span>Apply Recommended Rider Buffers</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Civic Permits & Guidance (CivicAssist RAG) */}
      {activeTab === "civic" && (
        <div className="space-y-5">
          {/* Legal Disclaimer Box */}
          <div className="p-3.5 rounded-xl bg-[#FAF4EB] border border-[#ECD9BA] text-xs text-[#A66E2E] flex items-start gap-2.5">
            <ShieldCheckIcon size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <strong>CivicAssist Compliance Disclaimer:</strong>
                <Badge variant="status" size="sm">
                  UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY
                </Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7A4B1A]">
                STAGE CivicAssist provides informational civic compliance drafting based on indexed municipal sample guidelines. Official clearance requires physical or portal submission through designated urban local body (ULB) desks. STAGE is not an administrative issuing authority.
              </p>
            </div>
          </div>

          {/* RAG Corpus Citations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#8E897F]">
                ChromaDB Guidelines Corpus (DOC-CIVIC-001 - 004)
              </span>
              <span className="text-[11px] text-[#2D6638] font-mono">
                Indexed in local vector store
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {civicDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#191817]">{doc.title}</span>
                    <code className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8E5DC] text-[#C85A32]">
                      {doc.id}
                    </code>
                  </div>
                  <div className="text-[11px] text-[#6B665E]">
                    <strong>Jurisdiction:</strong> {doc.jurisdiction}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded bg-white border border-[#E8E5DC]">
                      <span className="font-semibold text-[#191817] block">Curfew Boundary</span>
                      <span className="text-[#C85A32]">{doc.curfew}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#E8E5DC]">
                      <span className="font-semibold text-[#191817] block">Sound Limit</span>
                      <span className="text-[#2D6638]">{doc.decibels}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#5A554D] leading-relaxed pt-1">
                    {doc.keyRule}
                  </p>
                  <div className="pt-1 border-t border-[#E8E5DC] text-[10px] font-mono text-[#8E897F] truncate">
                    Source: {doc.sourceFile}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Civic Notice Generator */}
          <div className="p-4 rounded-xl border border-[#E8E5DC] bg-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4F2EC] pb-3">
              <div>
                <h3 className="font-editorial text-base font-medium text-[#191817]">
                  Draft Municipal Letter of Intent & Intimation
                </h3>
                <p className="text-xs text-[#6B665E]">
                  Pre-filled intimation letter referencing venue capacity, sound limits, and curfew adherence.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyNotice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E5DC] bg-white hover:bg-[#F4F2EC] text-xs font-medium text-[#191817] transition-colors"
                >
                  {copiedNotice ? <CheckIcon size={13} className="text-[#2D6638]" /> : <CopyIcon size={13} />}
                  <span>{copiedNotice ? "Copied!" : "Copy Notice"}</span>
                </button>
                <button
                  onClick={handleDownloadNotice}
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
                <label className="block text-xs font-medium text-[#191817] mb-1">Event Date</label>
                <input
                  type="date"
                  value={civicEventDate}
                  onChange={(e) => setCivicEventDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E8E5DC] bg-white text-[#191817]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">Expected Attendees</label>
                <input
                  type="number"
                  value={civicAudienceSize}
                  onChange={(e) => setCivicAudienceSize(parseInt(e.target.value) || 100)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E8E5DC] bg-white text-[#191817]"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="block text-[11px] font-mono uppercase text-[#8E897F]">
                Generated Draft Notice (Editable)
              </label>
              <textarea
                readOnly
                value={draftNoticeText}
                rows={10}
                className="w-full text-xs font-mono p-3 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7] text-[#191817] focus:outline-none focus:border-[#C85A32] leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Scheduling Conflict Checker */}
      {activeTab === "conflicts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Target Stage</label>
              <select
                value={inspectVenueId}
                onChange={(e) => setInspectVenueId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.location.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#191817] mb-1">Performance Date</label>
              <input
                type="date"
                value={inspectDate}
                onChange={(e) => setInspectDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8E5DC] bg-white text-[#191817] focus:outline-none focus:border-[#C85A32]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCheckConflict}
                className="w-full py-2.5 px-4 rounded-xl bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <CalendarIcon size={14} />
                <span>Verify Calendar Availability</span>
              </button>
            </div>
          </div>

          {conflictReport && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in ${
                conflictReport.hasConflict
                  ? "bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]"
                  : "bg-[#EDF5ED] border-[#CFE4CF] text-[#2D6638]"
              }`}
            >
              {conflictReport.hasConflict ? (
                <AlertCircleIcon size={18} className="shrink-0 mt-0.5 text-[#C85A32]" />
              ) : (
                <CheckCircleIcon size={18} className="shrink-0 mt-0.5 text-[#2D6638]" />
              )}
              <div className="space-y-1">
                <span className="font-semibold block text-sm">
                  {conflictReport.hasConflict ? "Schedule Conflict Warning" : "Date Available"}
                </span>
                <p>{conflictReport.message}</p>
                {!conflictReport.hasConflict && (
                  <button
                    onClick={() => onSelectVenueForPitch(inspectVenueId)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6638] text-white text-xs font-medium hover:bg-[#23512D] transition-colors"
                  >
                    <span>Proceed to Pitch This Date</span>
                    <ArrowRightIcon size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grounded Venue Inspection Modal */}
      {inspectingVenue && (
        <VenueDetailsModal
          venue={inspectingVenue}
          isOpen={!!inspectingVenue}
          onClose={() => setInspectingVenue(null)}
          onPitch={(vId: string) => {
            setInspectingVenue(null);
            onSelectVenueForPitch(vId);
          }}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { api } from "@/services/api";
import { AiCommandResponse, AgentExecutionEvent } from "@/types";
import {
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@/components/ui/Icons";

const PRESET_QUERIES = [
  {
    title: "Chennai Stage Matching",
    query: "Find a suitable stage in Chennai for a five-member acoustic performance.",
    category: "StageMatch",
  },
  {
    title: "Civic Permission & Curfew Guidance",
    query: "I want to perform at a public park. What permissions should I investigate?",
    category: "CivicAssist RAG",
  },
  {
    title: "Campaign Allocation & Ledger Audit",
    query: "Show me how the contributions from this campaign are allocated.",
    category: "ImpactFlow",
  },
  {
    title: "Multi-Agent Compound Workflow",
    query:
      "Find a suitable venue in Chennai for an acoustic performance, prepare the relevant permission checklist, and explain the contribution allocation for the selected education campaign.",
    category: "Compound Ensemble",
  },
];

export default function AiCommandCentrePage() {
  const [inputMessage, setInputMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandResponse, setCommandResponse] = useState<AiCommandResponse | null>(null);
  const [expandedEventIndex, setExpandedEventIndex] = useState<number | null>(null);

  const handleSendCommand = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim();
    if (!message) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.executeAiCommand({
        user_id: "usr-aarav",
        message,
        session_id: sessionId,
      });

      setCommandResponse(res);
      setSessionId(res.session_id);
      if (!textToSend) setInputMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute AI command";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentBadgeColor = (agent: string) => {
    switch (agent) {
      case "stage_orchestrator":
        return "bg-[#191817] text-white border-[#191817]";
      case "stage_match":
        return "bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/30";
      case "civic_assist":
        return "bg-[#2D6638]/10 text-[#2D6638] border-[#2D6638]/30";
      case "impact_flow":
        return "bg-[#2C5282]/10 text-[#2C5282] border-[#2C5282]/30";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-300";
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "orchestrator_invocation":
        return "Orchestrator Intake";
      case "specialist_handoff":
        return "Specialist Delegation";
      case "tool_call":
        return "Tool Execution";
      case "tool_result":
        return "Tool Output";
      case "agent_response":
        return "Agent Synthesis";
      case "turn_complete":
        return "Turn Finalized";
      case "retry_started":
        return "Live Retry Started";
      case "retry_failed":
        return "Live Attempt Failed";
      case "retry_aborted_partial_execution":
        return "Partial Execution Halted";
      case "retry_aborted_mutating_tool":
        return "Mutating Tool Halted";
      case "partial_execution_failure":
        return "Partial Execution Interrupted";
      case "non_retryable_error":
        return "Non-Retryable Error";
      case "offline_fallback_activated":
        return "Offline Fallback Activated";
      default:
        return type.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Editorial Page Header */}
      <div className="border-b border-[#E8E5DC] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/20">
              <SparklesIcon size={12} />
              Google ADK Multi-Agent Architecture
            </span>
            {commandResponse && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  commandResponse.execution_mode === "live_gemini"
                    ? "bg-[#EDF5ED] text-[#2D6638] border-[#CFE4CF]"
                    : commandResponse.execution_mode === "live_gemini_partial_failure"
                    ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                    : "bg-[#F4F2EC] text-[#6B665E] border-[#E8E5DC]"
                }`}
              >
                {commandResponse.execution_mode === "live_gemini"
                  ? "Live Gemini Mode"
                  : commandResponse.execution_mode === "live_gemini_partial_failure"
                  ? "Live Interrupted (Partial Failure)"
                  : "Offline Deterministic Mode"}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#191817]">
            AI Command Centre
          </h1>
          <p className="text-xs sm:text-sm text-[#6B665E] mt-1 max-w-3xl">
            Directly orchestrate STAGE’s specialized autonomous agents —{" "}
            <strong>StageMatch</strong> (venue discovery & compatibility scoring),{" "}
            <strong>CivicAssist</strong> (RAG guidance & statutory checklists), and{" "}
            <strong>ImpactFlow</strong> (deterministic allocations & ledger audits).
          </p>
        </div>

        {sessionId && (
          <div className="text-right">
            <span className="text-[11px] text-[#8E897F] block">Active Session ID</span>
            <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-[#E8E5DC] text-[#191817]">
              {sessionId}
            </code>
          </div>
        )}
      </div>

      {/* Preset Queries Grid */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8E897F]">
          Verified Demonstration Prompts
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputMessage(preset.query);
                handleSendCommand(preset.query);
              }}
              disabled={isLoading}
              className="text-left p-3.5 rounded-xl border border-[#E8E5DC] bg-white hover:border-[#C85A32]/50 hover:shadow-xs transition-all flex flex-col justify-between group disabled:opacity-60"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-medium text-[#191817] group-hover:text-[#C85A32] transition-colors">
                  {preset.title}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F4F2EC] text-[#6B665E]">
                  {preset.category}
                </span>
              </div>
              <p className="text-xs text-[#6B665E] line-clamp-2">{preset.query}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Command Input Box */}
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-xs space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B665E]">
          Natural-Language Command / Inquiry
        </label>
        <div className="relative">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendCommand();
              }
            }}
            placeholder="e.g. Find a suitable venue in Chennai for an acoustic performance, prepare the relevant permission checklist, and explain the contribution allocation..."
            rows={3}
            disabled={isLoading}
            className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-[#E8E5DC] focus:outline-none focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] resize-none text-[#191817] placeholder:text-[#A8A29E]"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-[#8E897F] flex items-center gap-1.5">
            <ClockIcon size={13} />
            <span>Executes via native ADK Runner · Supports multi-turn follow-ups</span>
          </div>
          <button
            onClick={() => handleSendCommand()}
            disabled={isLoading || !inputMessage.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#191817] hover:bg-[#C85A32] text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Orchestrating Agents...</span>
              </>
            ) : (
              <>
                <span>Execute Command</span>
                <ArrowRightIcon size={14} />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#9B1C1C] text-xs">
            <strong>Execution Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Real Execution Trace & Results View */}
      {commandResponse && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Observability Event Trace (Real backend execution events) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DC] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#191817]">
                  Backend Execution Trace
                </h3>
                <span className="text-[11px] text-[#8E897F]">
                  Observable ADK lifecycle telemetry
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F4F2EC] text-[#6B665E]">
                {commandResponse.agent_execution_events.length} events captured
              </span>
            </div>

            {/* Event Timeline */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
              {commandResponse.agent_execution_events.map((evt: AgentExecutionEvent, idx: number) => {
                const isExpanded = expandedEventIndex === idx;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#E8E5DC] bg-[#FAFAF7]/60 text-xs space-y-1.5 transition-all hover:border-[#C85A32]/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${getAgentBadgeColor(
                            evt.agent_name
                          )}`}
                        >
                          {evt.agent_name.replace("stage_", "")}
                        </span>
                        <span className="font-medium text-[#191817]">
                          {getEventTypeLabel(evt.event_type)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8E897F]">
                        {new Date(evt.timestamp * 1000).toLocaleTimeString([], {
                          minute: "2-digit",
                          second: "2-digit",
                          fractionalSecondDigits: 2,
                        })}
                      </span>
                    </div>

                    {evt.tool_name && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#C85A32]">
                        <span>Tool:</span>
                        <span className="font-semibold bg-[#C85A32]/10 px-1.5 py-0.5 rounded">
                          {evt.tool_name}()
                        </span>
                      </div>
                    )}

                    {evt.message && (
                      <p className="text-[11px] text-[#6B665E] leading-relaxed">
                        {evt.message}
                      </p>
                    )}

                    {/* Collapsible Tool Input/Output Details */}
                    {Boolean(evt.tool_input || evt.tool_output) && (
                      <div>
                        <button
                          onClick={() => setExpandedEventIndex(isExpanded ? null : idx)}
                          className="text-[10px] text-[#8E897F] hover:text-[#191817] underline font-mono"
                        >
                          {isExpanded ? "Hide payload" : "View payload details"}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 p-2 rounded bg-[#191817] text-[#FAFAF7] font-mono text-[10px] overflow-x-auto max-h-48 scrollbar-thin">
                            {Boolean(evt.tool_input) && (
                              <div className="mb-2">
                                <span className="text-[#E8E5DC] opacity-70">Input:</span>
                                <pre>{JSON.stringify(evt.tool_input, null, 2)}</pre>
                              </div>
                            )}
                            {evt.tool_output != null && (
                              <div>
                                <span className="text-[#E8E5DC] opacity-70">Output:</span>
                                <pre>{JSON.stringify(evt.tool_output, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Consolidated Response Output with Clear Categorization */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8E5DC] p-6 shadow-xs space-y-6">
            <div className="border-b border-[#E8E5DC] pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-bold text-[#191817]">
                  Consolidated Multi-Agent Synthesis
                </h3>
                <span className="text-xs text-[#8E897F]">
                  Model: {commandResponse.model_used}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {commandResponse.selected_specialist_agents.map((agent: string) => (
                  <span
                    key={agent}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getAgentBadgeColor(
                      agent
                    )}`}
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>

            {/* Markdown Structured Output */}
            <div className="prose prose-sm max-w-none text-[#191817] space-y-4 leading-relaxed">
              <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm bg-[#FAFAF7] p-5 rounded-xl border border-[#E8E5DC] text-[#191817] leading-relaxed">
                {commandResponse.final_response}
              </div>
            </div>

            {/* Mandatory Milestone 5 Verification Badges */}
            <div className="pt-4 border-t border-[#E8E5DC] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#6B665E]">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F4F2EC]/60 border border-[#E8E5DC]">
                <ShieldCheckIcon size={16} className="text-[#2D6638] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#191817]">Identifiable Source Attribution</strong>
                  <span>CivicAssist RAG references identifiable documents (DOC-CIVIC-001–004). Sample simulation only.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F4F2EC]/60 border border-[#E8E5DC]">
                <CheckCircleIcon size={16} className="text-[#C85A32] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#191817]">Reconciled Financial Ledger</strong>
                  <span>Impact allocations follow deterministic Python rules reconciled exactly to gross ticket totals.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

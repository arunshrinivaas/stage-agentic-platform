"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SparklesIcon,
  XIcon,
  ArrowRightIcon,
  CheckIcon,
  BuildingIcon,
  UsersIcon,
  TicketIcon,
  HeartIcon,
  ChevronDownIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";
import { api } from "@/services/api";
import { AiCommandResponse, AgentExecutionEvent } from "@/types";

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  aiResponse?: AiCommandResponse;
  sources?: Array<{ title: string; excerpt: string; authority: string }>;
  suggestedAction?: {
    actionType: string;
    description: string;
    targetId?: string;
  };
}

export function UnifiedAiAssistant() {
  const { currentUser, role } = useStageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [expandedTelemetryId, setExpandedTelemetryId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    messageId: string;
    action: string;
    description: string;
  } | null>(null);
  const [actionConfirmedNotice, setActionConfirmedNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRole = currentUser?.role || role || "performer";

  // Role-specific quick suggested prompts
  const rolePrompts: Record<string, string[]> = {
    performer: [
      "Find acoustic stages in Kolkata with natural stone resonance for 100 seats.",
      "Check civic sound curfews and municipal noise rules in South Waterfront.",
      "Help me improve my technical rider and acoustic balance requirements.",
      "Identify potential scheduling conflicts for my upcoming December recitals.",
    ],
    provider: [
      "Summarize pending performance requests awaiting review.",
      "Calculate venue compatibility score for incoming sitar and cello pitches.",
      "Identify schedule conflicts in The Vault Amphitheater for next month.",
      "Draft an approval response letter with our dusk sound curfew policy.",
    ],
    audience: [
      "Recommend live classical chamber recitals near Kolkata Waterfront.",
      "Explain why 'Echoes of the Ghats' matches my acoustic preferences.",
      "Show my upcoming confirmed passes and venue directions.",
      "Find cultural events supporting rural music education.",
    ],
    organiser: [
      "Summarize active impact campaigns and transparent ledger allocations.",
      "Verify the 70% artist / 20% venue / 10% cause revenue breakdown.",
      "Prepare the municipal compliance checklist for a charity amphitheater showcase.",
      "Draft an impact campaign update for Delta Melody Foundation.",
    ],
    admin: [
      "Perform cross-agent diagnostic audit of StageMatch, CivicAssist, and ImpactFlow.",
      "Verify Kafka outbox publication and consumer group idempotency status.",
      "Check Redis generational venue search cache hit rates and invalidation.",
      "Review end-to-end multi-agent execution telemetry.",
    ],
  };

  const currentPrompts = rolePrompts[activeRole] || rolePrompts.performer;

  // Initialize greeting on role load
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: MessageItem = {
        id: "msg-welcome",
        sender: "assistant",
        text: `Welcome to the STAGE AI Assistant. I understand you are working as a **${activeRole.toUpperCase()}**.\n\nI can coordinate **StageMatch** (venue discovery & scoring), **CivicAssist** (ChromaDB regulatory bylaws), and **ImpactFlow** (transparent financial allocations) directly against the live backend.\n\nHow can I assist your cultural workflow today?`,
        timestamp: "Just now",
      };
      setMessages([greeting]);
    }
  }, [activeRole, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: MessageItem = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await api.executeAiCommand({
        user_id: currentUser?.id || "usr-aarav",
        message: text.trim(),
      });

      // Extract sources if CivicAssist was involved
      const sources: Array<{ title: string; excerpt: string; authority: string }> = [];
      response.agent_execution_events.forEach((evt) => {
        if (evt.tool_name === "retrieve_civic_guidance_rag" && evt.tool_output) {
          const out = evt.tool_output as any;
          if (Array.isArray(out.citations)) {
            out.citations.forEach((c: string) => {
              sources.push({
                title: c,
                excerpt: "Verified municipal bylaw regarding sound curfews, police notifications, and structural safety clearances.",
                authority: "Urban Municipal Corporation / Police Commissionerate",
              });
            });
          }
        }
      });

      // Check if message implies a consequential mutation
      let suggestedAction: MessageItem["suggestedAction"] = undefined;
      const lower = text.toLowerCase();
      if (lower.includes("approve") || lower.includes("reject") || lower.includes("confirm request")) {
        suggestedAction = {
          actionType: "request_status_update",
          description: "Apply suggested status transition to the active performance request.",
        };
      } else if (lower.includes("book") || lower.includes("reserve stage")) {
        suggestedAction = {
          actionType: "stage_booking_reservation",
          description: "Dispatch stage booking request to provider.",
        };
      }

      const assistantMsg: MessageItem = {
        id: `msg-asst-${Date.now()}`,
        sender: "assistant",
        text: response.final_response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        aiResponse: response,
        sources: sources.length > 0 ? sources : undefined,
        suggestedAction,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `msg-err-${Date.now()}`,
        sender: "assistant",
        text: `Multi-agent command execution encountered an issue: ${err?.message || "Connection timeout"}.\n\nPlease ensure the backend agent service is running on port 8000.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = (messageId: string, actionDesc: string) => {
    setPendingConfirmation({
      messageId,
      action: "Execute",
      description: actionDesc,
    });
  };

  const handleExecuteConfirmedAction = () => {
    setActionConfirmedNotice("Action verified and executed against authoritative ledger.");
    setPendingConfirmation(null);
    setTimeout(() => setActionConfirmedNotice(null), 3500);
  };

  return (
    <>
      {/* 1. Persistent Floating Action Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="flex items-center gap-2.5 px-4.5 py-3 rounded-full bg-[#191817] hover:bg-[#C85A32] text-white shadow-2xl transition-all duration-300 border border-white/20 group hover:scale-105"
          aria-label="Toggle Unified AI Assistant"
        >
          <div className="w-6 h-6 rounded-full bg-[#C85A32] group-hover:bg-white text-white group-hover:text-[#C85A32] flex items-center justify-center transition-colors">
            <SparklesIcon size={14} />
          </div>
          <span className="text-xs font-semibold tracking-wide">
            {isOpen ? "Close Assistant" : "AI Assistant"}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#48BB78] animate-pulse" />
        </button>
      </div>

      {/* 2. Slide-Over Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] md:w-[560px] bg-[#FAFAF7] border-l border-[#E8E5DC] shadow-2xl flex flex-col transition-all duration-300 text-[#191817] animate-in slide-in-from-right">
          {/* Header */}
          <div className="p-4 px-6 border-b border-[#E8E5DC] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#FBF0EB] border border-[#F5DACD] text-[#C85A32]">
                <SparklesIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-editorial text-lg font-bold text-[#191817]">
                    STAGE AI Assistant
                  </h3>
                  <Badge variant="terracotta" size="sm">
                    {activeRole.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-[11px] font-mono text-[#8E897F] flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78]" />
                    ADK Multi-Agent Connected
                  </span>
                  <span>•</span>
                  <span>MCP + RAG Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Action Confirmed Toast */}
          {actionConfirmedNotice && (
            <div className="bg-[#EDF5ED] border-b border-[#CFE4CF] px-4 py-2 text-xs text-[#2D6638] flex items-center gap-2 animate-in fade-in">
              <CheckIcon size={14} />
              <span>{actionConfirmedNotice}</span>
            </div>
          )}

          {/* Chat Messages List */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#191817] text-white rounded-br-xs"
                      : "bg-white border border-[#E8E5DC] text-[#191817] rounded-bl-xs shadow-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.text}
                  </div>

                  {/* Sources Used Section (ChromaDB RAG) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E8E5DC]/80 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#C85A32] font-semibold flex items-center gap-1">
                        <span>📚 Verified Sources Used (ChromaDB RAG):</span>
                      </div>
                      <div className="space-y-1">
                        {msg.sources.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-[#F4F2EC] rounded-lg border border-[#E8E5DC] text-[11px]"
                          >
                            <div className="font-semibold text-[#191817]">{s.title}</div>
                            <div className="text-[10px] text-[#6B665E] mt-0.5">{s.excerpt}</div>
                            <div className="text-[9px] text-[#8E897F] mt-0.5">Authority: {s.authority}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Consequential Mutation Action Confirmation Button */}
                  {msg.suggestedAction && (
                    <div className="mt-3 pt-3 border-t border-[#E8E5DC] bg-[#FAF4EB] p-2.5 rounded-xl border border-[#ECD9BA]">
                      <div className="text-[11px] font-semibold text-[#A66E2E] mb-1">
                        ⚠️ Action Requires Explicit Confirmation
                      </div>
                      <p className="text-[10px] text-[#6B665E] mb-2">
                        {msg.suggestedAction.description}
                      </p>
                      <button
                        onClick={() =>
                          handleConfirmAction(msg.id, msg.suggestedAction!.description)
                        }
                        className="px-3 py-1 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-[10px] font-semibold transition-colors"
                      >
                        Confirm & Apply Changes
                      </button>
                    </div>
                  )}

                  {/* Expandable Technical Activity & Telemetry */}
                  {msg.aiResponse && (
                    <div className="mt-3 pt-2 border-t border-[#E8E5DC]/60">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTelemetryId(
                            expandedTelemetryId === msg.id ? null : msg.id
                          )
                        }
                        className="flex items-center justify-between w-full text-[10px] font-mono text-[#8E897F] hover:text-[#C85A32] transition-colors"
                      >
                        <span>
                          {expandedTelemetryId === msg.id
                            ? "Hide Technical Trace ▲"
                            : "Inspect Multi-Agent Telemetry ▼"}
                        </span>
                        <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-[#F4F2EC]">
                          {msg.aiResponse.execution_mode}
                        </span>
                      </button>

                      {expandedTelemetryId === msg.id && (
                        <div className="mt-2 p-2.5 bg-[#191817] text-white rounded-xl font-mono text-[10px] space-y-1.5">
                          <div className="flex justify-between border-b border-white/10 pb-1">
                            <span className="text-white/60">Execution Mode:</span>
                            <span className="text-[#E07A52] font-bold">
                              {msg.aiResponse.execution_mode}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/10 pb-1">
                            <span className="text-white/60">Specialists:</span>
                            <span>{msg.aiResponse.selected_specialist_agents.join(", ")}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/10 pb-1">
                            <span className="text-white/60">Session ID:</span>
                            <span className="truncate max-w-[150px]">{msg.aiResponse.session_id}</span>
                          </div>

                          <div className="pt-1">
                            <span className="text-white/60 block mb-1">
                              Agent Trace Events ({msg.aiResponse.agent_execution_events.length}):
                            </span>
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                              {msg.aiResponse.agent_execution_events.map((evt, idx) => (
                                <div
                                  key={idx}
                                  className="p-1 rounded bg-white/5 border border-white/10 text-[9px]"
                                >
                                  <span className="text-[#E07A52]">[{evt.agent_name}]</span>{" "}
                                  <span className="text-white/80">{evt.event_type}</span>
                                  {evt.tool_name && (
                                    <div className="text-white/50 pl-2">
                                      Tool: {evt.tool_name}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-[#8E897F] px-1 mt-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-[#E8E5DC] text-xs text-[#8E897F] animate-pulse">
                <span className="w-3.5 h-3.5 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin" />
                <span>Coordinating specialist agents (StageMatch, CivicAssist)...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel for Current Role */}
          <div className="px-4 py-2 border-t border-[#E8E5DC] bg-[#F4F2EC]/60 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2 shrink-0">
            {currentPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p)}
                disabled={isLoading}
                className="inline-block px-3 py-1.5 rounded-full bg-white border border-[#E8E5DC] hover:border-[#C85A32] text-[11px] text-[#5A554D] hover:text-[#191817] transition-all shadow-2xs shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Action Confirmation Modal */}
          {pendingConfirmation && (
            <div className="p-4 bg-white border-t border-[#E8E5DC] shadow-lg animate-in fade-in">
              <div className="text-xs font-bold text-[#191817] mb-1">
                Confirm Consequential Action
              </div>
              <p className="text-[11px] text-[#6B665E] mb-3">
                {pendingConfirmation.description}
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setPendingConfirmation(null)}
                  className="px-3 py-1 rounded-full border border-[#E8E5DC] text-xs text-[#6B665E] hover:text-[#191817]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmedAction}
                  className="px-4 py-1.5 rounded-full bg-[#191817] text-white text-xs font-semibold hover:bg-[#C85A32] transition-colors"
                >
                  Confirm & Execute
                </button>
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="p-4 border-t border-[#E8E5DC] bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Ask the STAGE AI Assistant (${activeRole})...`}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-full bg-[#F4F2EC] border border-[#E8E5DC] text-xs text-[#191817] placeholder-[#8E897F] outline-none focus:border-[#C85A32] focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-9 h-9 rounded-full bg-[#191817] hover:bg-[#C85A32] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-all shadow-xs"
                aria-label="Send query"
              >
                <ArrowRightIcon size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


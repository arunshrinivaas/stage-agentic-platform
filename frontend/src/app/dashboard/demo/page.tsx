"use client";

import React from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  UsersIcon,
  BuildingIcon,
  TicketIcon,
  HeartIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore, DEMO_PERSONAS } from "@/context/StageStoreContext";

export default function DemoHubPage() {
  const { setRole, demoLogin, setDemoMode } = useStageStore();

  const handleLaunchRole = async (role: "performer" | "provider" | "audience" | "organiser" | "admin") => {
    setDemoMode(true);
    await demoLogin(role);
  };

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in">
        {/* Hub Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#191817] via-[#2A2724] to-[#191817] text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-mono text-[#E07A52] uppercase tracking-wider mb-3">
              <SparklesIcon size={12} />
              <span>Multi-Role Demonstration Control Hub</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
              STAGE Unified Sandbox
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              Experience the end-to-end platform workflows across all four authenticated personas. Switch between Performer pitches, Venue approvals, Audience bookings, and Cause campaigns in real time.
            </p>
          </div>

          <div className="absolute right-6 -bottom-10 opacity-10 pointer-events-none hidden md:block">
            <span className="font-editorial text-9xl font-bold text-white">STAGE</span>
          </div>
        </div>

        {/* 4 Role Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Performer */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E5DC] shadow-xs flex flex-col justify-between hover:border-[#C85A32] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FBF0EB] text-[#C85A32] flex items-center justify-center">
                  <UsersIcon size={20} />
                </div>
                <Badge variant="terracotta" size="sm">
                  Role: Performer
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-[#191817]">Performer Creative Workspace</h2>
              <p className="text-xs text-[#6B665E] mt-1 leading-relaxed">
                Persona: <strong>{DEMO_PERSONAS.performer.name}</strong>. Create performance pitches, edit technical riders, alter date/budget terms, withdraw pitches, and view audit histories.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#F4F2EC] flex items-center justify-between">
              <Link
                href="/dashboard/performer"
                onClick={() => handleLaunchRole("performer")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#D96B43] transition-colors"
              >
                <span>Enter Performer Workspace</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* 2. Stage Provider */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E5DC] shadow-xs flex flex-col justify-between hover:border-[#2D6638] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EDF5ED] text-[#2D6638] flex items-center justify-center">
                  <BuildingIcon size={20} />
                </div>
                <Badge variant="status" size="sm">
                  Role: Stage Provider
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-[#191817]">Stage Provider Management</h2>
              <p className="text-xs text-[#6B665E] mt-1 leading-relaxed">
                Persona: <strong>{DEMO_PERSONAS.provider.name}</strong> ({DEMO_PERSONAS.provider.bio}). Manage venue listings, approve or reject pitches, and request revisions with audit notes.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#F4F2EC] flex items-center justify-between">
              <Link
                href="/dashboard/provider"
                onClick={() => handleLaunchRole("provider")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D6638] text-white text-xs font-semibold hover:bg-[#387C46] transition-colors"
              >
                <span>Enter Provider Workspace</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* 3. Audience */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E5DC] shadow-xs flex flex-col justify-between hover:border-[#2B4C7E] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EEF4FB] text-[#2B4C7E] flex items-center justify-center">
                  <TicketIcon size={20} />
                </div>
                <Badge variant="outline" size="sm">
                  Role: Audience Patron
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-[#191817]">Audience Pass & Booking Portal</h2>
              <p className="text-xs text-[#6B665E] mt-1 leading-relaxed">
                Persona: <strong>{DEMO_PERSONAS.audience.name}</strong>. Book live event passes, generate simulated digital tickets with QR codes, and track social cause contributions.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#F4F2EC] flex items-center justify-between">
              <Link
                href="/dashboard/audience"
                onClick={() => handleLaunchRole("audience")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2B4C7E] text-white text-xs font-semibold hover:bg-[#3A64A2] transition-colors"
              >
                <span>Enter Audience Portal</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* 4. Cause Organiser */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E5DC] shadow-xs flex flex-col justify-between hover:border-[#854D0E] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] text-[#854D0E] flex items-center justify-center">
                  <HeartIcon size={20} />
                </div>
                <Badge variant="outline" size="sm">
                  Role: Cause Organiser
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-[#191817]">Social Impact Campaign Hub</h2>
              <p className="text-xs text-[#6B665E] mt-1 leading-relaxed">
                Persona: <strong>{DEMO_PERSONAS.organiser.name}</strong>. Create cultural advocacy campaigns, link ticket revenue percentages, and inspect the transparent impact ledger.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#F4F2EC] flex items-center justify-between">
              <Link
                href="/dashboard/organiser"
                onClick={() => handleLaunchRole("organiser")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#854D0E] text-white text-xs font-semibold hover:bg-[#9C5B12] transition-colors"
              >
                <span>Enter Organiser Hub</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* AI Command Centre Card */}
        <div className="p-6 rounded-2xl bg-[#F4F2EC] border border-[#E8E5DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C85A32] to-[#7A280D] text-white flex items-center justify-center shrink-0 shadow-md">
              <SparklesIcon size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191817]">Google ADK Multi-Agent Command Centre</h3>
              <p className="text-xs text-[#6B665E]">
                Autonomous routing across StageMatch, CivicAssist RAG, and ImpactFlow with real-time MCP tool execution.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/command"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#191817] text-white text-xs font-semibold hover:bg-black transition-colors shrink-0"
          >
            <span>Open Command Centre</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}

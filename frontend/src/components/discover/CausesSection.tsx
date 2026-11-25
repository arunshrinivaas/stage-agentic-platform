"use client";

import React from "react";
import Image from "next/image";
import { HeartIcon, ShieldCheckIcon, TicketIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { SocialCause } from "@/types";

interface CausesSectionProps {
  causes: SocialCause[];
  onSelectCause: (cause: SocialCause) => void;
}

export function CausesSection({ causes, onSelectCause }: CausesSectionProps) {
  return (
    <section id="causes" className="py-20 border-b border-[#E8E5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="terracotta">Purpose-Driven Art</Badge>
              <Badge variant="outline">Active Causes</Badge>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-medium text-[#191817]">
              Causes That Matter
            </h2>
            <p className="text-sm sm:text-base text-[#6B665E] max-w-xl">
              Performers and venues on STAGE pledge proceeds to verified grassroots initiatives. Every ticket purchased and stage activated fuels community change.
            </p>
          </div>

          <div className="text-xs text-[#8E897F] font-mono self-start md:self-end">
            100% Transparent Impact Pools
          </div>
        </div>

        {/* Causes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {causes.map((cause) => {
            const percentage = Math.min(
              100,
              Math.round((cause.currentAmount / cause.targetAmount) * 100)
            );

            return (
              <div
                key={cause.id}
                className="group bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#D5D1C6] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Cause Image Container */}
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#191817]">
                    <Image
                      src={cause.imageUrl}
                      alt={cause.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Focus Area Pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge variant="dark" size="sm">
                        {cause.focusArea}
                      </Badge>
                      <Badge variant="status" size="sm">
                        Verified
                      </Badge>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 text-[11px]">
                        <TicketIcon size={12} className="text-[#E68A68]" />
                        <span>{cause.linkedPerformancesCount} Linked Showcases</span>
                      </div>
                    </div>
                  </div>

                  {/* Narrative Body */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-[#6B665E]">
                      <span className="font-medium text-[#191817]">
                        {cause.organizer.name}
                      </span>
                      {cause.organizer.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#2D6638] bg-[#EDF5ED] px-2 py-0.2 rounded-full border border-[#CFE4CF]">
                          <ShieldCheckIcon size={11} /> Verified Non-Profit
                        </span>
                      )}
                    </div>

                    <h3 className="font-editorial text-2xl font-medium text-[#191817] group-hover:text-[#C85A32] transition-colors leading-snug">
                      {cause.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#5A554D] leading-relaxed">
                      {cause.description}
                    </p>

                    {/* Progress Bar & Metric Numbers */}
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-semibold text-sm text-[#191817]">
                          {cause.currency}
                          {cause.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-[#8E897F]">
                          of {cause.currency}
                          {cause.targetAmount.toLocaleString()} target ({percentage}%)
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
                </div>

                {/* Card Action */}
                <div className="p-6 pt-0 border-t border-[#F4F2EC] mt-2">
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div className="text-xs text-[#8E897F]">
                      Supported by live ticket pledges
                    </div>
                    <button
                      onClick={() => onSelectCause(cause)}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-xs transition-colors shadow-2xs"
                    >
                      <HeartIcon size={13} />
                      <span>Contribute to Cause</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

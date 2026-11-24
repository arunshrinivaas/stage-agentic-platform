"use client";

import React from "react";
import Image from "next/image";
import { ArrowRightIcon, CalendarIcon, MapPinIcon, SparklesIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { STATS } from "@/data/mockData";

interface HeroSectionProps {
  onExploreEvents: () => void;
  onFindStage: () => void;
  onSelectSpotlight: () => void;
}

export function HeroSection({
  onExploreEvents,
  onFindStage,
  onSelectSpotlight,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-20 lg:pt-12 lg:pb-28 border-b border-[#E8E5DC]">
      {/* Background warm aesthetic ambient accents */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#FBF0EB]/60 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-[#F4F2EC]/80 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Eyebrow */}
        <div className="flex items-center gap-2 mb-6">
          <Badge variant="terracotta" size="md">
            Culture & Community Initiative
          </Badge>
          <span className="text-xs uppercase font-mono tracking-widest text-[#8E897F]">
            Milestone 1 Preview
          </span>
        </div>

        {/* Main Grid: Headline & Narrative on Left, Curated Photography on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#191817] leading-[1.08]">
              Every talent <br className="hidden sm:inline" />
              <span className="italic font-normal text-[#C85A32]">deserves</span> a stage.
            </h1>

            <p className="text-lg sm:text-xl text-[#5A554D] leading-relaxed max-w-xl font-normal">
              Discover performances, find spaces to showcase your talent, and bring communities together through meaningful experiences.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <button
                onClick={onExploreEvents}
                type="button"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-[#191817] text-white hover:bg-[#2D2A26] font-medium text-sm transition-all shadow-sm group"
              >
                <span>Explore Events</span>
                <ArrowRightIcon
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>

              <button
                onClick={onFindStage}
                type="button"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white text-[#191817] hover:bg-[#F4F2EC] border border-[#D5D1C6] font-medium text-sm transition-all shadow-2xs"
              >
                <span>Find Your Stage</span>
              </button>
            </div>

            {/* Impact Highlights Bar */}
            <div className="pt-8 border-t border-[#E8E5DC]/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="space-y-0.5">
                  <div className="font-editorial text-2xl font-bold text-[#191817]">
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium text-[#191817]">
                    {stat.label}
                  </div>
                  <div className="text-[11px] text-[#8E897F] hidden sm:block">
                    {stat.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Editorial Visual Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Primary Visual with Frame */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/5] shadow-xl border border-[#E8E5DC] bg-[#191817]">
                <Image
                  src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=85"
                  alt="Live dramatic stage performance in an amphitheater"
                  fill
                  priority
                  className="object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#191817] via-transparent to-transparent opacity-80" />

                {/* Overlaid Editorial Caption at Bottom */}
                <div className="absolute bottom-5 inset-x-5 text-white">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E68A68] animate-pulse" />
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[#E68A68]">
                      Curated Live Series
                    </span>
                  </div>
                  <h3 className="font-editorial text-lg font-medium leading-snug">
                    Resonating in historic stone vaults & open-air courtyards.
                  </h3>
                </div>
              </div>

              {/* Floating Featured Spotlight Card */}
              <div
                onClick={onSelectSpotlight}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSpotlight();
                  }
                }}
                className="absolute -bottom-6 -left-4 sm:-left-8 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-[#E8E5DC] shadow-lg max-w-[280px] sm:max-w-[310px] text-left cursor-pointer hover:border-[#C85A32] transition-all group"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <SparklesIcon size={14} className="text-[#C85A32]" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#C85A32]">
                      Tonight’s Spotlight
                    </span>
                  </div>
                  <Badge variant="demo" size="sm">
                    Live
                  </Badge>
                </div>

                <div className="text-xs font-semibold text-[#191817] line-clamp-1 group-hover:text-[#C85A32] transition-colors">
                  Echoes of the Ghats: Sitar & Cello Dialogue
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#6B665E] mt-1.5">
                  <span className="flex items-center gap-1">
                    <CalendarIcon size={12} /> Sat, 7:30 PM
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPinIcon size={12} /> Kolkata
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

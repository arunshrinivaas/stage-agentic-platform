"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  CalendarIcon,
  MapPinIcon,
  SearchIcon,
  TicketIcon,
  HeartIcon,
  FilterIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { PerformanceEvent, ArtCategory } from "@/types";

interface FeaturedPerformancesProps {
  events: PerformanceEvent[];
  onSelectEvent: (event: PerformanceEvent) => void;
}

const CATEGORIES: ArtCategory[] = [
  "All",
  "Music",
  "Dance",
  "Theatre",
  "Spoken Word",
  "Street Performance",
];

export function FeaturedPerformances({
  events,
  onSelectEvent,
}: FeaturedPerformancesProps) {
  const [activeCategory, setActiveCategory] = useState<ArtCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesCategory =
        activeCategory === "All" || evt.artForm === activeCategory;
      const matchesSearch =
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.performer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.location.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.subGenre.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [events, activeCategory, searchQuery]);

  return (
    <section id="performances" className="py-20 border-b border-[#E8E5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="terracotta">Curated Season</Badge>
              <Badge variant="outline">Live Season</Badge>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-medium text-[#191817]">
              Featured Performances
            </h2>
            <p className="text-sm sm:text-base text-[#6B665E] max-w-xl">
              Authentic acoustic and physical performances across music, classical dance, intimate theatre, spoken word, and public spaces.
            </p>
          </div>

          <div className="text-xs text-[#8E897F] font-mono self-start md:self-end">
            Showing {filteredEvents.length} of {events.length} Live Listings
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-8 mb-8 border-b border-[#E8E5DC]">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                type="button"
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-[#191817] text-white shadow-2xs"
                    : "bg-[#F4F2EC] text-[#5A554D] hover:bg-[#ECEAE1] border border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <SearchIcon
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E897F]"
            />
            <input
              type="text"
              placeholder="Search by artist, venue, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-full bg-[#F4F2EC] border border-[#E8E5DC] text-[#191817] placeholder-[#8E897F] focus:outline-none focus:bg-white focus:border-[#C85A32] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8E897F] hover:text-[#191817]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Event Cards Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-[#F4F2EC]/40 rounded-2xl border border-dashed border-[#D5D1C6]">
            <FilterIcon size={32} className="mx-auto text-[#8E897F] mb-3" />
            <h3 className="font-editorial text-xl font-medium text-[#191817] mb-1">
              No performances found
            </h3>
            <p className="text-xs sm:text-sm text-[#6B665E] max-w-sm mx-auto mb-4">
              Try adjusting your art form filter or search query to find available showcases.
            </p>
            <button
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
              }}
              className="px-4 py-2 text-xs rounded-full bg-[#191817] text-white font-medium"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="group bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#D5D1C6] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Performance Photograph Container */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#191817]">
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge variant="dark" size="sm">
                        {event.artForm}
                      </Badge>
                      {event.featured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C85A32] text-white flex items-center gap-1">
                          <SparklesIcon size={10} /> Spotlight
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3">
                      <Badge variant="status">Live</Badge>
                    </div>

                    {/* Bottom overlay: Date & Time */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <CalendarIcon size={13} className="text-[#E68A68]" />
                        <span>{event.date} · {event.time}</span>
                      </div>
                      <span className="text-[11px] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10">
                        {event.seats.status === "limited" ? "Selling Fast" : "Available"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 sm:p-6 space-y-3.5">
                    {/* Performer Micro-Bar */}
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#E8E5DC] shrink-0 border border-[#D5D1C6]">
                        <Image
                          src={event.performer.avatarUrl}
                          alt={event.performer.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#191817] truncate">
                          {event.performer.name}
                        </div>
                        <div className="text-[10px] text-[#8E897F] truncate">
                          {event.subGenre}
                        </div>
                      </div>
                    </div>

                    {/* Event Title */}
                    <h3 className="font-editorial text-xl font-medium text-[#191817] leading-snug group-hover:text-[#C85A32] transition-colors line-clamp-2">
                      {event.title}
                    </h3>

                    {/* Location & Venue */}
                    <div className="flex items-center gap-1.5 text-xs text-[#6B665E]">
                      <MapPinIcon size={13} className="shrink-0 text-[#C85A32]" />
                      <span className="truncate">
                        {event.location.venueName}, {event.location.city}
                      </span>
                    </div>

                    {/* Brief Narrative */}
                    <p className="text-xs text-[#6B665E] line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    {/* Linked Cause Indicator */}
                    {event.linkedCause && (
                      <div className="pt-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FBF0EB] border border-[#F5DACD] text-[11px] text-[#C85A32]">
                          <HeartIcon size={12} className="shrink-0" />
                          <span className="truncate">
                            Pledging {event.linkedCause.percentageContribution}% to{" "}
                            <strong>{event.linkedCause.name}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Seats & Reservation Action */}
                <div className="p-5 sm:p-6 pt-0 border-t border-[#F4F2EC] mt-2">
                  <div className="flex items-center justify-between gap-3 pt-3.5">
                    <div>
                      <div className="text-[11px] text-[#8E897F]">
                        {event.seats.available} seats left of {event.seats.total}
                      </div>
                      <div className="text-xs font-semibold text-[#191817]">
                        {event.seats.priceLabel}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectEvent(event)}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-xs transition-colors shadow-2xs"
                    >
                      <TicketIcon size={13} />
                      <span>Reserve</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


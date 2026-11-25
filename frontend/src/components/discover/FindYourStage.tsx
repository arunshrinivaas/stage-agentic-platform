"use client";

import React, { useState } from "react";
import Image from "next/image";
import { VenueImage } from "@/components/ui/VenueImage";
import {
  BuildingIcon,
  MapPinIcon,
  UsersIcon,
  CheckIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { StageVenue } from "@/types";

interface FindYourStageProps {
  venues: StageVenue[];
  onRequestVenue: (venue: StageVenue) => void;
}

export function FindYourStage({ venues, onRequestVenue }: FindYourStageProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const filteredVenues = venues.filter((venue) => {
    if (selectedFilter === "large") return venue.capacity.seated >= 100;
    if (selectedFilter === "intimate") return venue.capacity.seated < 100;
    return true;
  });

  return (
    <section id="stages" className="py-20 bg-[#F4F2EC]/40 border-b border-[#E8E5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">Spaces with Character</Badge>
              <Badge variant="outline">Verified Venues</Badge>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-medium text-[#191817]">
              Find Your Stage
            </h2>
            <p className="text-sm sm:text-base text-[#6B665E] max-w-xl">
              Are you a performer looking for acoustic intimacy, historic stone resonance, or open-air civic plazas? Discover vetted spaces ready to host your sound.
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2 self-start md:self-end">
            <button
              onClick={() => setSelectedFilter("all")}
              type="button"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedFilter === "all"
                  ? "bg-[#191817] text-white"
                  : "bg-white text-[#6B665E] border border-[#E8E5DC] hover:border-[#D5D1C6]"
              }`}
            >
              All Spaces
            </button>
            <button
              onClick={() => setSelectedFilter("large")}
              type="button"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedFilter === "large"
                  ? "bg-[#191817] text-white"
                  : "bg-white text-[#6B665E] border border-[#E8E5DC] hover:border-[#D5D1C6]"
              }`}
            >
              Amphitheaters (100+)
            </button>
            <button
              onClick={() => setSelectedFilter("intimate")}
              type="button"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedFilter === "intimate"
                  ? "bg-[#191817] text-white"
                  : "bg-white text-[#6B665E] border border-[#E8E5DC] hover:border-[#D5D1C6]"
              }`}
            >
              Intimate Studios (&lt;100)
            </button>
          </div>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredVenues.map((venue) => (
            <div
              key={venue.id}
              className="group bg-white rounded-2xl border border-[#E8E5DC] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#D5D1C6] transition-all flex flex-col justify-between"
            >
              <div>
                {/* Visual Imagery */}
                <div className="relative aspect-[16/9] overflow-hidden bg-[#191817]">
                  <VenueImage
                    src={venue.imageUrl}
                    alt={venue.name}
                    venueId={venue.id}
                    venueName={venue.name}
                    venueType={venue.venueType}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge variant="dark" size="sm">
                      {venue.venueType}
                    </Badge>
                    <Badge variant="status" size="sm">
                      Active Stage
                    </Badge>
                  </div>

                  {/* Availability Badge */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78] animate-pulse" />
                      <span>{venue.availabilityNotice}</span>
                    </div>

                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 text-[11px]">
                      <UsersIcon size={12} />
                      <span>{venue.capacity.formatted}</span>
                    </div>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-editorial text-2xl font-medium text-[#191817] group-hover:text-[#C85A32] transition-colors">
                      {venue.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#6B665E] mt-1">
                      <MapPinIcon size={13} className="text-[#C85A32] shrink-0" />
                      <span>
                        {venue.location.address}, {venue.location.neighborhood},{" "}
                        {venue.location.city}
                      </span>
                    </div>
                  </div>

                  {/* Suitable Categories */}
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E897F] mb-1.5">
                      Suitable Disciplines
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {venue.suitableCategories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2.5 py-0.5 rounded-md text-xs bg-[#F4F2EC] text-[#5A554D] border border-[#E8E5DC]"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Amenities Highlights */}
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E897F] mb-1.5">
                      Stage Rider & Features
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-[#5A554D]">
                      {venue.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-1.5">
                          <CheckIcon size={12} className="text-[#C85A32] shrink-0" />
                          <span className="truncate">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Host Policy */}
                  <div className="p-3 bg-[#FAF4EB] rounded-xl border border-[#ECD9BA] text-xs text-[#A66E2E] flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{venue.host.name}: </span>
                      <span>{venue.host.policy}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-6 pt-0 border-t border-[#F4F2EC] mt-2">
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="text-xs text-[#8E897F]">
                    Response time: ~24 hours via STAGE
                  </div>
                  <button
                    onClick={() => onRequestVenue(venue)}
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-xs transition-colors shadow-2xs"
                  >
                    <BuildingIcon size={14} />
                    <span>Request This Space</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

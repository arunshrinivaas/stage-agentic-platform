"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XIcon,
  BuildingIcon,
  MapPinIcon,
  UsersIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { VenueImage } from "@/components/ui/VenueImage";
import { StageVenue } from "@/types";

interface VenueDetailsModalProps {
  venue: StageVenue | null;
  isOpen: boolean;
  onClose: () => void;
  onPitch?: (venueId: string) => void;
  viewerRole?: string;
}

export function VenueDetailsModal({
  venue,
  isOpen,
  onClose,
  onPitch,
  viewerRole = "performer",
}: VenueDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !venue) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#191817]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-[#FAFAF7] rounded-3xl border border-[#E8E5DC] shadow-2xl flex flex-col max-h-[92vh] z-10 overflow-hidden text-[#191817] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E5DC] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#C85A32]/10 text-[#C85A32]">
              <BuildingIcon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-xl font-bold tracking-tight">
                  {venue.name}
                </h2>
                <Badge variant="status" size="sm">
                  Active Space
                </Badge>
              </div>
              <p className="text-xs text-[#6B665E]">
                {venue.location.city} · {venue.venueType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            aria-label="Close venue details"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Visual Imagery */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-[#191817] shadow-inner">
            <VenueImage
              src={venue.imageUrl}
              alt={venue.name}
              venueId={venue.id}
              venueName={venue.name}
              venueType={venue.venueType}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 text-white text-xs flex items-center gap-2">
              <span className="bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs font-mono">
                {venue.capacity.formatted}
              </span>
              <span className="bg-[#C85A32] px-2.5 py-1 rounded-full font-medium">
                {venue.venueType}
              </span>
            </div>
          </div>

          {/* Key Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-[#E8E5DC] rounded-xl">
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Seated Capacity
              </div>
              <div className="font-editorial text-lg font-bold text-[#191817]">
                {venue.capacity.seated} Seats
              </div>
            </div>
            <div className="p-3 bg-white border border-[#E8E5DC] rounded-xl">
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Standing / Lawn
              </div>
              <div className="font-editorial text-lg font-bold text-[#191817]">
                {venue.capacity.standing} Guests
              </div>
            </div>
            <div className="p-3 bg-white border border-[#E8E5DC] rounded-xl col-span-2 sm:col-span-1">
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Availability
              </div>
              <div className="text-xs font-semibold text-[#2D6638] mt-1">
                {venue.availabilityNotice}
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#191817]">
              <MapPinIcon size={14} className="text-[#C85A32]" />
              <span>Location & Neighborhood</span>
            </div>
            <p className="text-xs text-[#5A554D]">
              {venue.location.address}, {venue.location.neighborhood}, {venue.location.city}
            </p>
          </div>

          {/* Amenities & Acoustic Character */}
          <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
            <div className="text-xs font-semibold text-[#191817]">
              Acoustic Profile & Amenities
            </div>
            <div className="flex flex-wrap gap-1.5">
              {venue.amenities.map((amenity, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-[#F4F2EC] text-[#191817] border border-[#E8E5DC]"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          {/* Suitable Art Categories */}
          <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
            <div className="text-xs font-semibold text-[#191817]">
              Suitable Art Categories
            </div>
            <div className="flex flex-wrap gap-1.5">
              {venue.suitableCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-md text-[11px] bg-[#FBF0EB] text-[#C85A32] border border-[#F8D2C9] font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Host Policies */}
          <div className="p-4 bg-[#FAF4EB] border border-[#ECD9BA] rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#A66E2E]">
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon size={14} />
                <span>Host: {venue.host.name} ({venue.host.role})</span>
              </span>
            </div>
            <p className="text-xs text-[#78531C] leading-relaxed">
              <strong>Policy:</strong> {venue.host.policy}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E8E5DC] bg-white flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-full border border-[#E8E5DC] text-xs font-medium text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
          >
            Close
          </button>

          {onPitch && (
            <button
              onClick={() => {
                onPitch(venue.id);
                onClose();
              }}
              type="button"
              className="px-5 py-2 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors shadow-2xs"
            >
              Pitch Rider to this Stage →
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}


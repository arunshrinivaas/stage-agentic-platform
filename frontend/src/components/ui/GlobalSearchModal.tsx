"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStageStore } from "@/context/StageStoreContext";
import {
  CalendarIcon,
  BuildingIcon,
  HeartIcon,
  TicketIcon,
  XIcon,
} from "@/components/ui/Icons";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { events, venues, causes, bookings } = useStageStore();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();

    const matchedEvents = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.performer.name.toLowerCase().includes(q) ||
        e.location.city.toLowerCase().includes(q) ||
        e.artForm.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedVenues = venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.location.city.toLowerCase().includes(q) ||
        v.venueType.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedCauses = causes.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.focusArea.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedBookings = bookings.filter(
      (b) =>
        b.bookingCode.toLowerCase().includes(q) ||
        b.eventTitle.toLowerCase().includes(q)
    ).slice(0, 3);

    const totalCount =
      matchedEvents.length +
      matchedVenues.length +
      matchedCauses.length +
      matchedBookings.length;

    return {
      events: matchedEvents,
      venues: matchedVenues,
      causes: matchedCauses,
      bookings: matchedBookings,
      totalCount,
    };
  }, [query, events, venues, causes, bookings]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4 sm:px-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E8E5DC] overflow-hidden z-10 flex flex-col max-h-[75vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-[#E8E5DC] flex items-center gap-3 bg-[#FAFAF7]">
          <span className="text-sm text-[#8E897F]">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, stages, causes, passes, or booking codes..."
            className="flex-1 bg-transparent text-sm text-[#191817] outline-none placeholder:text-[#8E897F]"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-[#E8E5DC] text-[#6B665E] rounded">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC]"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-4 space-y-4">
          {!results ? (
            <div className="py-8 text-center text-xs text-[#8E897F]">
              Type a title, artist name, city (e.g. Kolkata, Mumbai), or booking reference.
            </div>
          ) : results.totalCount === 0 ? (
            <div className="py-8 text-center text-xs text-[#8E897F]">
              No results found matching &quot;<strong>{query}</strong>&quot;.
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Events */}
              {results.events.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#8E897F] mb-1.5 flex items-center gap-1">
                    <CalendarIcon size={12} className="text-[#C85A32]" />
                    <span>Performances ({results.events.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.events.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => {
                          onClose();
                          router.push("/#performances");
                        }}
                        className="p-2.5 rounded-xl hover:bg-[#F4F2EC] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-[#191817]">{e.title}</div>
                          <div className="text-[11px] text-[#6B665E]">
                            {e.performer.name} · {e.location.venueName}, {e.location.city}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FBF0EB] text-[#C85A32]">
                          {e.artForm}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Venues */}
              {results.venues.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#8E897F] mb-1.5 flex items-center gap-1">
                    <BuildingIcon size={12} className="text-[#C85A32]" />
                    <span>Stages & Venues ({results.venues.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.venues.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          onClose();
                          router.push("/#stages");
                        }}
                        className="p-2.5 rounded-xl hover:bg-[#F4F2EC] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-[#191817]">{v.name}</div>
                          <div className="text-[11px] text-[#6B665E]">
                            {v.venueType} · {v.location.neighborhood}, {v.location.city}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#6B665E]">
                          {v.capacity.formatted}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Causes */}
              {results.causes.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#8E897F] mb-1.5 flex items-center gap-1">
                    <HeartIcon size={12} className="text-[#C85A32]" />
                    <span>Social Impact Causes ({results.causes.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.causes.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onClose();
                          router.push("/#causes");
                        }}
                        className="p-2.5 rounded-xl hover:bg-[#F4F2EC] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-[#191817]">{c.title}</div>
                          <div className="text-[11px] text-[#6B665E]">
                            {c.focusArea} · {c.organizer.name}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#2D6638] font-medium">
                          ₹{c.currentAmount.toLocaleString()} raised
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passes & Bookings */}
              {results.bookings.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#8E897F] mb-1.5 flex items-center gap-1">
                    <TicketIcon size={12} className="text-[#C85A32]" />
                    <span>Your Bookings & Digital Passes ({results.bookings.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.bookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onClose();
                          router.push(`/verify-pass?token=stg_tok_${b.bookingCode}`);
                        }}
                        className="p-2.5 rounded-xl hover:bg-[#F4F2EC] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-[#191817]">{b.eventTitle}</div>
                          <div className="text-[11px] text-[#6B665E]">
                            Pass: {b.bookingCode} · {b.eventDate}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#C85A32] font-mono underline">
                          Open Pass &rarr;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-[#E8E5DC] bg-[#FAFAF7] flex items-center justify-between text-[11px] text-[#8E897F]">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <Link href="/verify-pass" onClick={onClose} className="text-[#C85A32] hover:underline">
              Pass Scanner Portal
            </Link>
          </div>
          <span className="hidden sm:inline">Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  XIcon,
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  HeartIcon,
  DownloadIcon,
  BellIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { PerformanceEvent } from "@/types";
import { downloadIcsFile } from "@/services/calendarService";
import { api } from "@/services/api";

interface EventDetailsModalProps {
  event: PerformanceEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onReservePass?: (event: PerformanceEvent) => void;
  isAlreadyBooked?: boolean;
}

export function EventDetailsModal({
  event,
  isOpen,
  onClose,
  onReservePass,
  isAlreadyBooked = false,
}: EventDetailsModalProps) {
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [isSettingReminder, setIsSettingReminder] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      setReminderStatus(null);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const handleExportIcs = () => {
    downloadIcsFile({
      id: event.id,
      title: event.title,
      description: `${event.description} | Performed by ${event.performer.name}`,
      venueName: event.location.venueName,
      city: event.location.city,
      date: event.date,
      time: event.time,
    });
  };

  const handleCreateReminder = async () => {
    setIsSettingReminder(true);
    setReminderStatus(null);
    try {
      await api.createReminder({
        title: `Live Performance: ${event.title}`,
        target_date: event.date,
        target_time: event.time || "19:30",
        venue: `${event.location.venueName}, ${event.location.city}`,
        category: "event",
        advance_hours: 24,
      });
      setReminderStatus("Reminder set for 24 hours prior to event!");
      setTimeout(() => setReminderStatus(null), 4000);
    } catch {
      setReminderStatus("Reminder already scheduled for this performance.");
      setTimeout(() => setReminderStatus(null), 4000);
    } finally {
      setIsSettingReminder(false);
    }
  };

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
              <CalendarIcon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-xl font-bold tracking-tight">
                  {event.title}
                </h2>
                <Badge variant="terracotta" size="sm">
                  {event.artForm}
                </Badge>
              </div>
              <p className="text-xs text-[#6B665E]">
                {event.performer.name} · {event.date} · {event.time}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            aria-label="Close event details"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Feedback */}
          {reminderStatus && (
            <div className="p-3 rounded-xl bg-[#EDF5ED] border border-[#CFE4CF] text-[#2D6638] text-xs font-medium flex items-center gap-2">
              <CheckCircleIcon size={14} />
              <span>{reminderStatus}</span>
            </div>
          )}

          {/* Event Image */}
          <div className="relative aspect-[16/8] rounded-2xl overflow-hidden bg-[#191817] shadow-inner">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 text-white text-xs flex items-center gap-2">
              <span className="bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs font-mono">
                {event.seats.priceLabel}
              </span>
              <span className="bg-[#2D6638] px-2.5 py-1 rounded-full font-medium">
                {event.seats.available} of {event.seats.total} Seats Available
              </span>
            </div>
          </div>

          {/* Performer & Venue Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-1">
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Performer
              </div>
              <div className="font-semibold text-sm text-[#191817]">
                {event.performer.name}
              </div>
              <div className="text-xs text-[#6B665E]">
                {event.performer.handle} · {event.subGenre || event.artForm}
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-1">
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Venue & Schedule
              </div>
              <div className="font-semibold text-sm text-[#191817] flex items-center gap-1">
                <MapPinIcon size={13} className="text-[#C85A32]" />
                <span>{event.location.venueName}</span>
              </div>
              <div className="text-xs text-[#6B665E]">
                {event.location.city} · {event.date} at {event.time}
              </div>
            </div>
          </div>

          {/* Artistic Description */}
          <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
            <div className="text-xs font-semibold text-[#191817]">
              Artistic Statement & Production Details
            </div>
            <p className="text-xs text-[#5A554D] leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Social Impact Linked Cause */}
          {event.linkedCause && (
            <div className="p-4 bg-[#FAF4EB] border border-[#ECD9BA] rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#A66E2E]">
                <span className="flex items-center gap-1.5">
                  <HeartIcon size={14} />
                  <span>Linked Cause: {event.linkedCause.name}</span>
                </span>
                <Badge variant="terracotta" size="sm">
                  {event.linkedCause.percentageContribution}% Ticket Pledge
                </Badge>
              </div>
              <p className="text-xs text-[#78531C]">
                {event.linkedCause.percentageContribution}% of each pass purchase directly funds grassroots cultural initiatives verified through STAGE.
              </p>
            </div>
          )}

          {/* Calendar & Reminder Tools */}
          <div className="p-4 bg-[#F4F2EC]/60 border border-[#E8E5DC] rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-[#191817] flex items-center justify-between">
              <span>Calendar Export & Reminders</span>
              <span className="text-[10px] font-mono text-[#8E897F]">RFC 5545 .ics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportIcs}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E8E5DC] hover:border-[#C85A32] text-xs font-medium text-[#191817] transition-colors shadow-2xs"
              >
                <DownloadIcon size={13} />
                <span>Download .ics File</span>
              </button>
              <button
                type="button"
                onClick={handleCreateReminder}
                disabled={isSettingReminder}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E8E5DC] hover:border-[#C85A32] text-xs font-medium text-[#191817] transition-colors shadow-2xs"
              >
                <BellIcon size={13} />
                <span>{isSettingReminder ? "Scheduling..." : "Schedule 24h Reminder"}</span>
              </button>
            </div>
            <div className="text-[10px] text-[#8E897F]">
              Note: Generates a standard .ics calendar file to import directly into your local Apple Calendar, Google Calendar, or Outlook.
            </div>
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

          {isAlreadyBooked ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EDF5ED] text-[#2D6638] text-xs font-semibold border border-[#CFE4CF]">
              <CheckCircleIcon size={14} /> Pass Reserved & Valid
            </span>
          ) : onReservePass ? (
            <button
              onClick={() => {
                onReservePass(event);
                onClose();
              }}
              type="button"
              className="px-5 py-2 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors shadow-2xs"
            >
              Reserve Pass →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}


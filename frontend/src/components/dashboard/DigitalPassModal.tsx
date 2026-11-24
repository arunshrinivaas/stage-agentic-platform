"use client";

import React from "react";
import { XIcon, QrCodeIcon, HeartIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { AudienceBooking } from "@/types";

interface DigitalPassModalProps {
  booking: AudienceBooking | null;
  onClose: () => void;
}

export function DigitalPassModal({ booking, onClose }: DigitalPassModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#191817]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Pass Card Container */}
      <div className="relative w-full max-w-md bg-[#FAFAF7] rounded-3xl border border-[#E8E5DC] shadow-2xl overflow-hidden z-10 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors z-20"
          aria-label="Close pass"
        >
          <XIcon size={18} />
        </button>

        {/* Top Header of Pass */}
        <div className="bg-[#191817] text-white p-6 pb-8 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-editorial text-lg font-bold tracking-tight text-white">
              STAGE PASS
            </span>
            <Badge variant="demo" size="sm" className="bg-[#2D2A26] text-[#E68A68] border-[#3E3A34]">
              Verified Digital Ticket
            </Badge>
          </div>
          <h3 className="font-editorial text-2xl font-medium leading-snug pt-2">
            {booking.eventTitle}
          </h3>
          <div className="text-xs text-[#A8A398]">
            Art Form: {booking.eventArtForm}
          </div>
        </div>

        {/* Notched divider */}
        <div className="relative h-6 bg-[#FAFAF7] flex items-center justify-between px-4">
          <div className="w-5 h-5 rounded-full bg-[#191817] -ml-6" />
          <div className="border-t border-dashed border-[#D5D1C6] flex-1 mx-2" />
          <div className="w-5 h-5 rounded-full bg-[#191817] -mr-6" />
        </div>

        {/* Pass Details Body */}
        <div className="p-6 pt-2 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Date & Time
              </div>
              <div className="font-medium text-[#191817] mt-0.5">
                {booking.eventDate}
              </div>
              <div className="text-[#6B665E]">{booking.eventTime}</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Venue & City
              </div>
              <div className="font-medium text-[#191817] mt-0.5">
                {booking.venueName}
              </div>
              <div className="text-[#6B665E]">{booking.city}</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Attendee Name
              </div>
              <div className="font-medium text-[#191817] mt-0.5">
                {booking.attendeeName}
              </div>
              <div className="text-[#6B665E]">{booking.ticketCount} General Admission</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8E897F]">
                Booking Reference
              </div>
              <div className="font-mono font-semibold text-[#C85A32] mt-0.5">
                {booking.bookingCode}
              </div>
              <div className="text-[11px] text-[#2D6638] font-medium">Paid ₹{booking.totalPaid}</div>
            </div>
          </div>

          {/* Social Impact Pledge Snippet */}
          {booking.linkedCauseName && (
            <div className="p-3 bg-[#FBF0EB] border border-[#F5DACD] rounded-xl text-xs text-[#C85A32] flex items-center gap-2">
              <HeartIcon size={16} className="shrink-0" />
              <span>
                <strong>₹{booking.causeContributionAmount}</strong> of this ticket directly supports{" "}
                {booking.linkedCauseName}.
              </span>
            </div>
          )}

          {/* QR Code Placeholder Graphic */}
          <div className="text-center p-4 bg-white rounded-2xl border border-[#E8E5DC] space-y-2">
            <div className="w-24 h-24 mx-auto border-2 border-[#191817] rounded-xl p-2 flex items-center justify-center bg-[#F4F2EC]">
              <QrCodeIcon size={72} className="text-[#191817]" />
            </div>
            <div className="font-mono text-[11px] text-[#8E897F]">
              {booking.bookingCode}
            </div>
            <p className="text-[10px] text-[#8E897F]">
              Show this QR code at the door for entry. Demonstration simulated pass.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-[#191817] text-white hover:bg-[#2D2A26] font-medium text-xs transition-colors"
          >
            Close Pass
          </button>
        </div>
      </div>
    </div>
  );
}

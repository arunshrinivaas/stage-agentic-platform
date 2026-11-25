"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/discover/HeroSection";
import { FeaturedPerformances } from "@/components/discover/FeaturedPerformances";
import { FindYourStage } from "@/components/discover/FindYourStage";
import { CausesSection } from "@/components/discover/CausesSection";
import { EcosystemSection } from "@/components/discover/EcosystemSection";
import {
  ReservationModal,
  ModalPayload,
} from "@/components/ui/ReservationModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { MOCK_PERFORMANCES, MOCK_VENUES, MOCK_CAUSES } from "@/data/mockData";
import { PerformanceEvent, StageVenue, SocialCause } from "@/types";

export default function DiscoverPage() {
  const [modalPayload, setModalPayload] = useState<ModalPayload>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectEvent = (event: PerformanceEvent) => {
    setModalPayload({ type: "event", data: event });
  };

  const handleRequestVenue = (venue: StageVenue) => {
    setModalPayload({ type: "venue", data: venue });
  };

  const handleSelectCause = (cause: SocialCause) => {
    setModalPayload({ type: "cause", data: cause });
  };

  return (
    <div id="discover" className="min-h-screen flex flex-col bg-[#FAFAF7] text-[#191817]">
      {/* Navigation */}
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <HeroSection
          onExploreEvents={() => scrollToSection("performances")}
          onFindStage={() => scrollToSection("stages")}
          onSelectSpotlight={() => handleSelectEvent(MOCK_PERFORMANCES[0])}
        />

        {/* 2. Featured Performances */}
        <FeaturedPerformances
          events={MOCK_PERFORMANCES}
          onSelectEvent={handleSelectEvent}
        />

        {/* 3. Find Your Stage */}
        <FindYourStage
          venues={MOCK_VENUES}
          onRequestVenue={handleRequestVenue}
        />

        {/* 4. Causes That Matter */}
        <CausesSection
          causes={MOCK_CAUSES}
          onSelectCause={handleSelectCause}
        />

        {/* 5. The Four Pillars / Ecosystem */}
        <EcosystemSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Reservation / Booking / Donation Modal */}
      <ReservationModal
        payload={modalPayload}
        onClose={() => setModalPayload(null)}
      />

      {/* Central Settings Centre Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

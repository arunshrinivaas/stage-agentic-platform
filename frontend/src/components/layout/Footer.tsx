import React from "react";
import { StageLogo } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";

export function Footer() {
  return (
    <footer className="bg-[#191817] text-[#FAFAF7] border-t border-[#2D2A26] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Newsletter & Brand Statement Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16 border-b border-[#2D2A26]">
          {/* Brand Identity & Mission */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#2D2A26] border border-[#3E3A34]">
                <StageLogo className="w-6 h-6 text-[#E68A68]" />
              </div>
              <span className="font-editorial text-2xl font-bold tracking-tight text-white">
                STAGE
              </span>
            </div>

            <p className="text-sm text-[#A8A398] max-w-md leading-relaxed">
              Where talent meets purpose. A cultural infrastructure connecting performers, stage providers, audiences, and social-impact initiatives through curated live experiences.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <Badge variant="status" className="bg-[#2D2A26] text-[#E68A68] border-[#3E3A34]">
                National Cultural Network
              </Badge>
              <span className="text-xs text-[#A8A398]">
                Live Arts Infrastructure · 2026
              </span>
            </div>
          </div>

          {/* Newsletter / Cultural Dispatch */}
          <div className="lg:col-span-7 bg-[#23211F] p-6 sm:p-8 rounded-2xl border border-[#2D2A26]">
            <h4 className="font-editorial text-xl font-medium text-white mb-2">
              The Stage Dispatch
            </h4>
            <p className="text-xs sm:text-sm text-[#A8A398] mb-4 leading-relaxed">
              Curated weekly performance listings, newly listed architectural stages, and verified social-impact milestone dispatches.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you for subscribing to STAGE Dispatch demo.");
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="email"
                required
                placeholder="Enter your email address"
                className="flex-1 px-4 py-2.5 text-sm rounded-full bg-[#191817] border border-[#3E3A34] text-white placeholder-[#78736B] focus:outline-none focus:border-[#E68A68]"
              />
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium rounded-full bg-[#C85A32] hover:bg-[#B54D27] text-white transition-colors shrink-0"
              >
                Join Dispatch
              </button>
            </form>
          </div>
        </div>

        {/* Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-b border-[#2D2A26] text-xs sm:text-sm">
          {/* For Performers */}
          <div>
            <h5 className="font-medium uppercase tracking-wider text-white text-xs mb-4">
              For Performers
            </h5>
            <ul className="space-y-2.5 text-[#A8A398]">
              <li>
                <a href="#stages" className="hover:text-white transition-colors">
                  Discover Stages
                </a>
              </li>
              <li>
                <a href="#stages" className="hover:text-white transition-colors">
                  Submit Technical Rider
                </a>
              </li>
              <li>
                <span className="text-[#646059] flex items-center justify-between">
                  Artist Grants <span className="text-[10px] uppercase font-mono">Q2</span>
                </span>
              </li>
              <li>
                <span className="text-[#646059] flex items-center justify-between">
                  AI Booking Agent <span className="text-[10px] uppercase font-mono">Next</span>
                </span>
              </li>
            </ul>
          </div>

          {/* For Stage Providers */}
          <div>
            <h5 className="font-medium uppercase tracking-wider text-white text-xs mb-4">
              Stage Providers
            </h5>
            <ul className="space-y-2.5 text-[#A8A398]">
              <li>
                <a href="#stages" className="hover:text-white transition-colors">
                  List an Acoustic Space
                </a>
              </li>
              <li>
                <a href="#stages" className="hover:text-white transition-colors">
                  Venue Guidelines
                </a>
              </li>
              <li>
                <span className="text-[#646059]">Revenue Share Models</span>
              </li>
              <li>
                <span className="text-[#646059]">Host Safety Standards</span>
              </li>
            </ul>
          </div>

          {/* For Audiences & Causes */}
          <div>
            <h5 className="font-medium uppercase tracking-wider text-white text-xs mb-4">
              Audiences & Impact
            </h5>
            <ul className="space-y-2.5 text-[#A8A398]">
              <li>
                <a href="#performances" className="hover:text-white transition-colors">
                  Explore Live Events
                </a>
              </li>
              <li>
                <a href="#causes" className="hover:text-white transition-colors">
                  Causes That Matter
                </a>
              </li>
              <li>
                <span className="text-[#646059]">Digital RSVPs</span>
              </li>
              <li>
                <span className="text-[#646059]">Impact Ledger</span>
              </li>
            </ul>
          </div>

          {/* Platform & Ethics */}
          <div>
            <h5 className="font-medium uppercase tracking-wider text-white text-xs mb-4">
              Ecosystem
            </h5>
            <ul className="space-y-2.5 text-[#A8A398]">
              <li>
                <a href="#ecosystem" className="hover:text-white transition-colors">
                  The Four Pillars
                </a>
              </li>
              <li>
                <span className="text-[#646059]">Manifesto</span>
              </li>
              <li>
                <span className="text-[#646059]">Open Architecture</span>
              </li>
              <li>
                <span className="text-[#646059]">Privacy & Transparency</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78736B]">
          <p>© 2026 STAGE Platform Inc. Built with Purpose. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#A8A398] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#A8A398] cursor-pointer">Privacy Notice</span>
            <span className="hover:text-[#A8A398] cursor-pointer">Demonstration Sandbox</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

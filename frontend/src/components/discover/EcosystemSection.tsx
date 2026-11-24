import React from "react";
import { UsersIcon, BuildingIcon, TicketIcon, HeartIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";

export function EcosystemSection() {
  const pillars = [
    {
      role: "Performers",
      tagline: "Discover Spaces & Reclaim Voice",
      description:
        "Musicians, dancers, actors, and spoken-word bards easily discover acoustically rich venues, submit digital riders, and retain up to 85% of box office revenues.",
      icon: UsersIcon,
      accent: "text-[#C85A32] bg-[#FBF0EB]",
    },
    {
      role: "Stage Providers",
      tagline: "Activate Venues with Soul",
      description:
        "Historic vaults, sunlit lofts, and civic courtyards list available evening and weekend hours, welcoming curated talent while supporting neighborhood cultural life.",
      icon: BuildingIcon,
      accent: "text-[#191817] bg-[#F4F2EC]",
    },
    {
      role: "Audiences",
      tagline: "Intimate, Meaningful Access",
      description:
        "Step beyond stadium spectacles. Discover acoustic performances in spaces where you share the room and the breath with the performer, with zero ticket gouging.",
      icon: TicketIcon,
      accent: "text-[#A66E2E] bg-[#FAF4EB]",
    },
    {
      role: "Social Causes",
      tagline: "Circular Cultural Impact",
      description:
        "Every registered performance can pledge a percentage of proceeds directly to grassroots education, elder folk preservation, or youth mental health.",
      icon: HeartIcon,
      accent: "text-[#2D6638] bg-[#EDF5ED]",
    },
  ];

  return (
    <section id="ecosystem" className="py-20 bg-[#F4F2EC]/60 border-b border-[#E8E5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2">
            <Badge variant="default">The Circular Model</Badge>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-medium text-[#191817]">
            How the STAGE Ecosystem Works
          </h2>
          <p className="text-sm sm:text-base text-[#6B665E] leading-relaxed">
            A cohesive platform where creative talent, physical architectural spaces, passionate audiences, and grassroots causes reinforce one another.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.role}
                className="bg-white p-6 rounded-2xl border border-[#E8E5DC] shadow-2xs hover:shadow-sm hover:border-[#D5D1C6] transition-all flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${pillar.accent}`}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className="font-editorial text-xl font-medium text-[#191817] mb-1">
                    {pillar.role}
                  </h3>
                  <div className="text-xs font-semibold text-[#C85A32] mb-3">
                    {pillar.tagline}
                  </div>
                  <p className="text-xs sm:text-sm text-[#6B665E] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#F4F2EC] flex items-center justify-between text-xs text-[#8E897F]">
                  <span className="font-mono uppercase text-[10px] tracking-wider">
                    Ecosystem Pillar
                  </span>
                  <span className="text-[#191817] font-medium">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


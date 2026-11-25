"use client";

import React, { useState } from "react";
import { XIcon, CheckIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { ArtCategory } from "@/types";
import { useStageStore } from "@/context/StageStoreContext";

interface AddVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (name: string) => void;
}

const CATEGORIES: Array<Exclude<ArtCategory, "All">> = [
  "Music",
  "Dance",
  "Theatre",
  "Spoken Word",
  "Street Performance",
];

export function AddVenueModal({ isOpen, onClose, onSuccessToast }: AddVenueModalProps) {
  const { addVenue } = useStageStore();

  const [name, setName] = useState("");
  const [venueType, setVenueType] = useState("Historic Brick Loft");
  const [address, setAddress] = useState("12 Warehouse Enclave");
  const [neighborhood, setNeighborhood] = useState("Arts Quarter");
  const [city, setCity] = useState("Mumbai");
  const [seatedCapacity, setSeatedCapacity] = useState(120);
  const [standingCapacity, setStandingCapacity] = useState(180);
  const [selectedCategories, setSelectedCategories] = useState<Array<Exclude<ArtCategory, "All">>>([
    "Music",
    "Theatre",
  ]);
  const [amenitiesInput, setAmenitiesInput] = useState(
    "Sprung Wooden Floor, DMX Stage Lights, Green Room, PA Speakers"
  );
  const [policy, setPolicy] = useState("85% box-office proceeds retained by artist");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleCategory = (cat: Exclude<ArtCategory, "All">) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addVenue({
      name: name || "New Heritage Stage",
      venueType,
      location: {
        address,
        neighborhood,
        city,
      },
      capacity: {
        seated: Number(seatedCapacity),
        standing: Number(standingCapacity),
        formatted: `${seatedCapacity} seated · ${standingCapacity} standing`,
      },
      suitableCategories: selectedCategories.length > 0 ? selectedCategories : ["Music"],
      amenities: amenitiesInput
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      availabilityNotice: "Open for Weekend Dusk & Evening slots",
      availabilityStatus: "open_slots",
      host: {
        name: "Stage Steward & Community Board",
        role: "Verified Venue Host",
        policy,
      },
      imageUrl: "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=900&auto=format&fit=crop&q=85",
    });

    setIsSubmitted(true);
    onSuccessToast?.(name || "New Venue");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#191817]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#FAFAF7] rounded-2xl border border-[#E8E5DC] shadow-2xl p-6 sm:p-8 z-10 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
          aria-label="Close dialog"
        >
          <XIcon size={20} />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#EDF5ED] text-[#2D6638] flex items-center justify-center mb-4">
              <CheckIcon size={28} />
            </div>
            <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-2">
              Venue Successfully Listed
            </h3>
            <p className="text-sm text-[#6B665E] mb-6 max-w-sm mx-auto leading-relaxed">
              Your venue is now active in the STAGE directory. Performers can now view your technical specifications and submit performance riders.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                onClose();
              }}
              className="w-full py-3 px-5 rounded-full bg-[#191817] text-white hover:bg-[#2D2A26] font-medium text-sm transition-all"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="terracotta">List a Venue</Badge>
              <Badge variant="status">Active Space</Badge>
            </div>

            <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-1">
              Add a New Performance Space
            </h3>
            <p className="text-xs text-[#6B665E] mb-5">
              List your amphitheater, loft, cellar, or courtyard for performer discovery.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Venue Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Copper Roof Studio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Architectural Type
                  </label>
                  <input
                    type="text"
                    required
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Street Address & Area
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Neighborhood
                  </label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Seated Capacity
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={seatedCapacity}
                    onChange={(e) => setSeatedCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#191817] mb-1">
                    Standing Capacity
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={standingCapacity}
                    onChange={(e) => setStandingCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                  />
                </div>
              </div>

              {/* Suitable Categories Checklist */}
              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1.5">
                  Suitable Art Forms
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 text-xs rounded-full border transition-all ${
                          isSelected
                            ? "bg-[#C85A32] text-white border-[#C85A32]"
                            : "bg-white text-[#5A554D] border-[#E8E5DC] hover:border-[#D5D1C6]"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Amenities & Technical Specs (comma separated)
                </label>
                <input
                  type="text"
                  value={amenitiesInput}
                  onChange={(e) => setAmenitiesInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#191817] mb-1">
                  Performer Revenue Split Policy
                </label>
                <input
                  type="text"
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-[#E8E5DC] focus:outline-none focus:border-[#C85A32] text-[#191817]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitted}
                className="w-full py-3 px-5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Publish Venue to Directory
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

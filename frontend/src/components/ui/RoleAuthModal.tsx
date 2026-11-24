"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { XIcon, UsersIcon, BuildingIcon, TicketIcon, HeartIcon, ArrowRightIcon } from "./Icons";
import { Badge } from "./Badge";
import { useStageStore } from "@/context/StageStoreContext";
import { RoleType } from "@/types";

interface RoleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleAuthModal({ isOpen, onClose }: RoleAuthModalProps) {
  const router = useRouter();
  const { setRole } = useStageStore();
  const [selectedRole, setSelectedRole] = useState<RoleType>("performer");

  if (!isOpen) return null;

  const roles = [
    {
      id: "performer" as RoleType,
      title: "Performer / Artist",
      path: "/dashboard/performer",
      description: "Discover acoustic stages, submit technical riders, and manage gig bookings.",
      icon: UsersIcon,
    },
    {
      id: "provider" as RoleType,
      title: "Stage Provider",
      path: "/dashboard/provider",
      description: "List amphitheaters, studios or lofts, review requests, and approve performance dates.",
      icon: BuildingIcon,
    },
    {
      id: "audience" as RoleType,
      title: "Audience Member",
      path: "/dashboard/audience",
      description: "Discover intimate performances, reserve seats, and contribute to causes.",
      icon: TicketIcon,
    },
    {
      id: "organiser" as RoleType,
      title: "Social Cause Partner",
      path: "/dashboard/organiser",
      description: "Create impact campaigns, partner with touring performers, and track transparent funding.",
      icon: HeartIcon,
    },
  ] as const;

  const handleEnterWorkspace = () => {
    const roleConfig = roles.find((r) => r.id === selectedRole) || roles[0];
    setRole(roleConfig.id);
    onClose();
    router.push(roleConfig.path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#191817]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-[#FAFAF7] rounded-2xl border border-[#E8E5DC] shadow-2xl p-6 sm:p-8 z-10 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
          aria-label="Close dialog"
        >
          <XIcon size={20} />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="terracotta">Role-Based Experience</Badge>
            <Badge variant="demo">Milestone 2</Badge>
          </div>

          <h3 className="font-editorial text-2xl font-medium text-[#191817] mb-1.5">
            Choose Your Role on STAGE
          </h3>
          <p className="text-xs sm:text-sm text-[#6B665E] mb-5">
            Select a workspace to experience STAGE through that persona’s eyes.
          </p>

          <div className="space-y-2.5 mb-6">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-white border-[#C85A32] shadow-xs"
                      : "bg-[#F4F2EC]/60 border-[#E8E5DC] hover:border-[#D5D1C6]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-[#C85A32] text-white"
                        : "bg-white text-[#6B665E] border border-[#E8E5DC]"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[#191817]">
                        {role.title}
                      </div>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-[#C85A32]">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6B665E] mt-0.5 leading-relaxed">
                      {role.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleEnterWorkspace}
            type="button"
            className="w-full py-3.5 px-5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <span>Enter {roles.find((r) => r.id === selectedRole)?.title} Workspace</span>
            <ArrowRightIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

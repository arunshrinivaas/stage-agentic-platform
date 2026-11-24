"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  StageLogo,
  BellIcon,
  ChevronDownIcon,
  UsersIcon,
  BuildingIcon,
  TicketIcon,
  HeartIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";
import { RoleType } from "@/types";

interface RoleOption {
  id: RoleType;
  label: string;
  path: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ROLES: RoleOption[] = [
  {
    id: "performer",
    label: "Performer",
    path: "/dashboard/performer",
    description: "Portfolio, stage pitches & gigs",
    icon: UsersIcon,
  },
  {
    id: "provider",
    label: "Stage Provider",
    path: "/dashboard/provider",
    description: "Venue listings & approvals",
    icon: BuildingIcon,
  },
  {
    id: "audience",
    label: "Audience",
    path: "/dashboard/audience",
    description: "Bookings, passes & favorites",
    icon: TicketIcon,
  },
  {
    id: "organiser",
    label: "Cause Organiser",
    path: "/dashboard/organiser",
    description: "Campaigns & impact ledger",
    icon: HeartIcon,
  },
];

export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, setRole, notifications, markNotificationAsRead, isOnline } = useStageStore();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  // Determine current active role from pathname
  const currentRoleOption =
    ROLES.find((r) => pathname.startsWith(r.path)) ||
    ROLES.find((r) => r.id === role) ||
    ROLES[0];

  const handleSelectRole = (selectedRole: RoleOption) => {
    setRole(selectedRole.id);
    setRoleMenuOpen(false);
    router.push(selectedRole.path);
  };

  const roleNotifs = notifications.filter((n) => n.role === currentRoleOption.id || n.type === "system");
  const unreadCount = roleNotifs.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF7]/95 backdrop-blur-md border-b border-[#E8E5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Role Badge */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none"
              title="Return to Public Discover Page"
            >
              <div className="p-1.5 rounded-lg bg-[#F4F2EC] border border-[#E8E5DC] group-hover:border-[#C85A32] transition-colors">
                <StageLogo className="w-5 h-5 text-[#C85A32]" />
              </div>
              <span className="font-editorial text-xl font-bold tracking-tight text-[#191817]">
                STAGE
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-[#E8E5DC]">
              <span className="text-xs uppercase font-mono tracking-wider text-[#8E897F]">
                Workspace
              </span>
              <Badge variant="terracotta" size="sm">
                {currentRoleOption.label}
              </Badge>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-[#2D6638] bg-[#EDF5ED] border border-[#CFE4CF]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78] animate-pulse" />
                  <span>API Live</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-[#8E897F] bg-[#F4F2EC] border border-[#E8E5DC]">
                  <span>Local Mock</span>
                </span>
              )}
            </div>
          </div>

          {/* Center: Live Role Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setRoleMenuOpen(!roleMenuOpen);
                setNotifMenuOpen(false);
              }}
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E5DC] hover:border-[#C85A32] text-xs font-medium text-[#191817] shadow-2xs transition-all"
              aria-label="Switch Demo Role"
              aria-expanded={roleMenuOpen}
            >
              <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-pulse" />
              <span className="text-[#6B665E] hidden md:inline">Role:</span>
              <span className="font-semibold">{currentRoleOption.label}</span>
              <ChevronDownIcon size={14} className="text-[#8E897F]" />
            </button>

            {/* Role Switcher Dropdown */}
            {roleMenuOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 w-72 bg-white rounded-2xl border border-[#E8E5DC] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-[#F4F2EC] text-[11px] font-mono uppercase tracking-wider text-[#8E897F]">
                  Switch Demo Workspace
                </div>
                <div className="space-y-1 mt-1">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isActive = currentRoleOption.id === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRole(r)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          isActive
                            ? "bg-[#FBF0EB] text-[#C85A32]"
                            : "hover:bg-[#F4F2EC] text-[#191817]"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-[#C85A32] text-white"
                              : "bg-[#F4F2EC] text-[#6B665E]"
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold leading-tight flex items-center justify-between">
                            <span>{r.label}</span>
                            {isActive && (
                              <span className="text-[10px] font-mono uppercase text-[#C85A32]">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#6B665E] truncate mt-0.5">
                            {r.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Notifications & Return to Public Discover */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifMenuOpen(!notifMenuOpen);
                  setRoleMenuOpen(false);
                }}
                type="button"
                className="relative p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
                aria-label="View notifications"
              >
                <BellIcon size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C85A32] text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {notifMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-2xl border border-[#E8E5DC] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F4F2EC]">
                    <span className="text-xs font-semibold text-[#191817]">
                      Notifications
                    </span>
                    <Badge variant="demo" size="sm">
                      Simulated
                    </Badge>
                  </div>

                  {roleNotifs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#8E897F]">
                      No new notifications for {currentRoleOption.label}.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {roleNotifs.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-2.5 rounded-xl text-left cursor-pointer transition-colors text-xs ${
                            n.read
                              ? "bg-white text-[#6B665E]"
                              : "bg-[#FAF4EB] border border-[#ECD9BA] text-[#191817]"
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold mb-0.5">
                            <span>{n.title}</span>
                            <span className="text-[10px] text-[#8E897F]">
                              {n.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-[#5A554D]">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Back to Public Discover Link */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#191817] bg-[#F4F2EC] hover:bg-[#ECEAE1] border border-[#E8E5DC] transition-colors"
            >
              <span>Discover</span>
              <span className="text-[#8E897F]">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

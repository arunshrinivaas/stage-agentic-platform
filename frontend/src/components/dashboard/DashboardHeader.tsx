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
  SparklesIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";
import { RoleType } from "@/types";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { GlobalSearchModal } from "@/components/ui/GlobalSearchModal";

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
  const {
    currentUser,
    role,
    setRole,
    isMultiRole,
    demoMode,
    setDemoMode,
    logout,
    notifications,
    markNotificationAsRead,
    isOnline,
  } = useStageStore();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    router.push("/login");
  };

  const roleNotifs = notifications.filter(
    (n) => n.role === currentRoleOption.id || n.type === "system"
  );
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

            <div className="flex items-center gap-2 pl-3 border-l border-[#E8E5DC]">
              <Badge variant="terracotta" size="sm">
                {currentRoleOption.label}
              </Badge>
            </div>
          </div>

          {/* Center: Live Role Switcher (Visible ONLY for Multi-Role Users or Demo Mode) */}
          <div className="relative">
            {isMultiRole && (
              <div>
                <button
                  onClick={() => {
                    setRoleMenuOpen(!roleMenuOpen);
                    setNotifMenuOpen(false);
                    setUserMenuOpen(false);
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
                    <div className="px-3 py-2 border-b border-[#F4F2EC] flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8E897F]">
                      <span>Switch Workspace</span>
                      <span className="text-[#C85A32]">Demo Mode</span>
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
            )}
          </div>

          {/* Right: Notifications, User Profile Menu & Public Discover Link */}
          <div className="flex items-center gap-2.5">
            {/* Global Platform Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              type="button"
              className="px-3 py-1.5 rounded-full bg-[#F4F2EC] hover:bg-[#ECEAE1] border border-[#E8E5DC] text-xs text-[#6B665E] hidden sm:flex items-center gap-2 transition-colors"
              title="Search platform (Cmd+K)"
            >
              <span>Search...</span>
              <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8E5DC] text-[#6B665E]">⌘K</kbd>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifMenuOpen(!notifMenuOpen);
                  setRoleMenuOpen(false);
                  setUserMenuOpen(false);
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
                    <Badge variant="terracotta" size="sm">
                      {isOnline ? "Transactional Bus" : "Local Ledger"}
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

            {/* Central Settings Control */}
            <button
              onClick={() => {
                setSettingsOpen(true);
                setUserMenuOpen(false);
                setNotifMenuOpen(false);
              }}
              type="button"
              className="p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
              aria-label="Open Central Settings"
              title="Central Settings Centre"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* User Profile / Account Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setRoleMenuOpen(false);
                  setNotifMenuOpen(false);
                }}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-white border border-[#E8E5DC] hover:border-[#C85A32] transition-colors"
                aria-label="User Account Menu"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-[#F4F2EC] border border-[#E8E5DC] shrink-0">
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#C85A32]">
                      {currentUser?.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-[#191817] hidden sm:inline max-w-[100px] truncate">
                  {currentUser?.name || "Patron"}
                </span>
                <ChevronDownIcon size={12} className="text-[#8E897F]" />
              </button>

              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl border border-[#E8E5DC] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="pb-2.5 mb-2 border-b border-[#F4F2EC]">
                    <div className="text-xs font-bold text-[#191817]">
                      {currentUser?.name || "Anonymous Patron"}
                    </div>
                    <div className="text-[11px] text-[#6B665E] truncate">
                      {currentUser?.email || "guest@stage.live"}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant="terracotta" size="sm">
                        {currentUser?.role?.toUpperCase() || "PATRON"}
                      </Badge>
                      {currentUser?.role === "admin" && (
                        <span className="text-[10px] font-mono text-[#854D0E] bg-[#FEF9C3] px-1.5 py-0.5 rounded">
                          ALL ROLES
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* Demo Mode Toggle for Admins / Multi-role */}
                    <button
                      type="button"
                      onClick={() => {
                        setDemoMode(!demoMode);
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs text-[#191817] hover:bg-[#F4F2EC] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <SparklesIcon size={14} className="text-[#C85A32]" />
                        <span>Demo / Admin Mode</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          demoMode
                            ? "bg-[#EDF5ED] text-[#2D6638]"
                            : "bg-[#F4F2EC] text-[#8E897F]"
                        }`}
                      >
                        {demoMode ? "ON" : "OFF"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs text-[#191817] hover:bg-[#F4F2EC] transition-colors"
                    >
                      <span>Settings Centre</span>
                      <span className="text-[#8E897F] ml-auto">⚙</span>
                    </button>

                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs text-[#191817] hover:bg-[#F4F2EC] transition-colors"
                    >
                      <span>Public Discovery</span>
                      <span className="text-[#8E897F] ml-auto">↗</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs text-red-600 hover:bg-red-50 transition-colors pt-2 border-t border-[#F4F2EC]"
                    >
                      <span>Sign Out</span>
                      <span className="ml-auto text-xs">→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Central Settings Centre Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}

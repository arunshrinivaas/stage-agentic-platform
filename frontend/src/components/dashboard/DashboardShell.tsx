"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardHeader } from "./DashboardHeader";
import {
  UsersIcon,
  BuildingIcon,
  TicketIcon,
  HeartIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { useStageStore } from "@/context/StageStoreContext";
import { UnifiedAiAssistant } from "@/components/ai/UnifiedAiAssistant";

interface DashboardShellProps {
  children: React.ReactNode;
}

const NAV_TABS = [
  {
    roleId: "performer",
    label: "Performer Dashboard",
    path: "/dashboard/performer",
    icon: UsersIcon,
  },
  {
    roleId: "provider",
    label: "Stage Provider",
    path: "/dashboard/provider",
    icon: BuildingIcon,
  },
  {
    roleId: "audience",
    label: "Audience Experience",
    path: "/dashboard/audience",
    icon: TicketIcon,
  },
  {
    roleId: "organiser",
    label: "Cause Organiser",
    path: "/dashboard/organiser",
    icon: HeartIcon,
  },
  {
    roleId: "command",
    label: "AI Command Centre",
    path: "/dashboard/command",
    icon: SparklesIcon,
  },
];

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isAuthLoaded, isMultiRole, demoMode } = useStageStore();

  // Redirect unauthenticated visitors to /login
  useEffect(() => {
    if (isAuthLoaded && !currentUser) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthLoaded, currentUser, router, pathname]);

  // Enforce role authorization boundaries for single-role users
  useEffect(() => {
    if (!isAuthLoaded || !currentUser) return;
    if (isMultiRole) return; // Admin or Demo Mode allows navigating anywhere

    const userRole = currentUser.role;
    // Map of role paths
    const rolePaths: Record<string, string> = {
      performer: "/dashboard/performer",
      provider: "/dashboard/provider",
      audience: "/dashboard/audience",
      organiser: "/dashboard/organiser",
    };

    // If user is on another role's dashboard, redirect to their assigned dashboard
    const isVisitingOtherRole = Object.entries(rolePaths).some(
      ([roleKey, rolePath]) =>
        roleKey !== userRole &&
        (pathname === rolePath || pathname.startsWith(rolePath + "/"))
    );

    if (isVisitingOtherRole) {
      router.replace(rolePaths[userRole] || "/dashboard");
    }
  }, [isAuthLoaded, currentUser, isMultiRole, pathname, router]);

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] text-[#191817]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#8E897F] uppercase tracking-wider">
            Loading Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7] text-[#191817]">
      {/* Top Header */}
      <DashboardHeader />

      {/* Navigation Sub-Header */}
      {isMultiRole ? (
        /* Multi-Role / Demo Mode Tab Bar */
        <div className="border-b border-[#E8E5DC] bg-[#F4F2EC]/60 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2 overflow-x-auto scrollbar-none">
              <nav className="flex items-center gap-2" aria-label="Role Switcher Tabs">
                {NAV_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive =
                    pathname === tab.path || pathname.startsWith(tab.path + "/");
                  return (
                    <Link
                      key={tab.roleId}
                      href={tab.path}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-[#191817] text-white shadow-2xs"
                          : "bg-white text-[#6B665E] hover:text-[#191817] border border-[#E8E5DC]"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#E8E5DC]">
                <span className="text-[11px] font-mono text-[#854D0E] bg-[#FEF9C3] px-2.5 py-1 rounded-full border border-[#FDE047] flex items-center gap-1.5">
                  <SparklesIcon size={12} />
                  <span>Admin Multi-Role Scope</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {children}
      </main>

      {/* Footer Note */}
      <footer className="border-t border-[#E8E5DC] bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8E897F] gap-2">
          <span>STAGE Platform · Role-Based Authenticated Environment</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#191817]">
              Public Discover Page
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-[#191817]">
              Switch Account
            </Link>
          </div>
        </div>
      </footer>

      {/* Persistent Unified AI Assistant across all authenticated workspaces */}
      <UnifiedAiAssistant />
    </div>
  );
}

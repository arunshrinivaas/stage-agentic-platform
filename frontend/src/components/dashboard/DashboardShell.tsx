"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "./DashboardHeader";
import { UsersIcon, BuildingIcon, TicketIcon, HeartIcon, SparklesIcon } from "@/components/ui/Icons";

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
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7] text-[#191817]">
      {/* Top Header */}
      <DashboardHeader />

      {/* Role Navigation Tab Bar */}
      <div className="border-b border-[#E8E5DC] bg-[#F4F2EC]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none" aria-label="Role Switcher Tabs">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
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
        </div>
      </div>

      {/* Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {children}
      </main>

      {/* Footer Note */}
      <footer className="border-t border-[#E8E5DC] bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8E897F] gap-2">
          <span>STAGE Platform · Milestone 2 Role-Based Demonstration Sandbox</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#191817]">
              Public Discover Page
            </Link>
            <span>•</span>
            <span>Simulated Financial & Booking Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


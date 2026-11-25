"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStageStore } from "@/context/StageStoreContext";

export default function DashboardHubPage() {
  const router = useRouter();
  const { currentUser, isAuthLoaded } = useStageStore();

  useEffect(() => {
    if (!isAuthLoaded) return;

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // Route directly to assigned role workspace
    const roleRoutes: Record<string, string> = {
      performer: "/dashboard/performer",
      provider: "/dashboard/provider",
      audience: "/dashboard/audience",
      organiser: "/dashboard/organiser",
      admin: "/dashboard/command",
    };

    const target = roleRoutes[currentUser.role] || "/dashboard/performer";
    router.replace(target);
  }, [currentUser, isAuthLoaded, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8E897F]">Directing to your STAGE workspace...</p>
      </div>
    </div>
  );
}


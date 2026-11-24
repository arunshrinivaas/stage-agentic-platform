"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStageStore } from "@/context/StageStoreContext";

export default function DashboardHubPage() {
  const router = useRouter();
  const { role } = useStageStore();

  useEffect(() => {
    // Route to user's selected role dashboard
    const target =
      role === "provider"
        ? "/dashboard/provider"
        : role === "audience"
        ? "/dashboard/audience"
        : role === "organiser"
        ? "/dashboard/organiser"
        : "/dashboard/performer";

    router.replace(target);
  }, [role, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8E897F]">Loading your STAGE workspace...</p>
      </div>
    </div>
  );
}


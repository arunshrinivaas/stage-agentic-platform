import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "terracotta" | "dark" | "outline" | "demo" | "status";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: BadgeProps) {
  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-xs tracking-wide"
      : "px-3 py-1 text-xs tracking-wider";

  const variantClasses = {
    default:
      "bg-[#F4F2EC] text-[#5A554D] border border-[#E8E5DC] font-medium",
    terracotta:
      "bg-[#FBF0EB] text-[#C85A32] border border-[#F5DACD] font-medium",
    dark:
      "bg-[#191817] text-[#FAFAF7] font-medium",
    outline:
      "bg-transparent text-[#6B665E] border border-[#D5D1C6] font-medium",
    demo:
      "bg-[#FAF4EB] text-[#A66E2E] border border-[#ECD9BA] font-mono text-[10px] uppercase tracking-widest font-semibold",
    status:
      "bg-[#EDF5ED] text-[#2D6638] border border-[#CFE4CF] font-medium",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full uppercase transition-colors ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}


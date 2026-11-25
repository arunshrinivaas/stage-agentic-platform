"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StageLogo, MenuIcon, XIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { useStageStore } from "@/context/StageStoreContext";
import { GlobalSearchModal } from "@/components/ui/GlobalSearchModal";

interface NavbarProps {
  onOpenSettings?: () => void;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  const router = useRouter();
  const { currentUser } = useStageStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Discover", href: "#discover", active: true },
    { label: "Find a Stage", href: "#stages", active: false },
    { label: "Perform", href: "#performances", active: false },
    { label: "Causes", href: "#causes", active: false },
    { label: "Community", href: "#ecosystem", active: false },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      setMobileMenuOpen(false);
    }
  };

  const handleEnterPlatform = () => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        router.push("/dashboard/command");
      } else {
        router.push(`/dashboard/${currentUser.role}`);
      }
    } else {
      router.push("/login");
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ${
        scrolled
          ? "bg-[#FAFAF7]/90 backdrop-blur-md border-b border-[#E8E5DC] py-3.5 shadow-xs"
          : "bg-[#FAFAF7] border-b border-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="STAGE Home"
          >
            <div className="p-1.5 rounded-lg bg-[#F4F2EC] border border-[#E8E5DC] group-hover:border-[#C85A32] transition-colors">
              <StageLogo className="w-6 h-6 text-[#C85A32]" />
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-2xl font-bold tracking-tight text-[#191817]">
                STAGE
              </span>
              <span className="text-[10px] tracking-widest uppercase text-[#8E897F] -mt-1 font-medium hidden sm:inline-block">
                Where Talent Meets Purpose
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main Navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={`relative px-3.5 py-1.5 text-sm font-medium transition-colors rounded-full ${
                  item.active
                    ? "text-[#191817] bg-[#F4F2EC]"
                    : "text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC]/60"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              onClick={() => setIsSearchOpen(true)}
              type="button"
              className="px-3.5 py-1.5 text-xs text-[#8E897F] bg-[#F4F2EC] hover:bg-[#ECEAE1] rounded-full border border-[#E8E5DC] flex items-center gap-2 transition-colors"
            >
              <span>Search platform...</span>
              <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8E5DC] text-[#6B665E]">⌘K</kbd>
            </button>
            <button
              onClick={onOpenSettings}
              type="button"
              className="px-3 py-1.5 text-xs font-medium text-[#6B665E] hover:text-[#191817] transition-colors flex items-center gap-1.5"
            >
              <span>Settings</span>
            </button>
            <button
              onClick={handleEnterPlatform}
              type="button"
              className="inline-flex items-center gap-2 px-4.5 py-2 text-sm font-medium text-white bg-[#191817] hover:bg-[#C85A32] rounded-full transition-all shadow-xs"
            >
              <span>Enter Platform</span>
              <ArrowRightIcon size={14} />
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={handleEnterPlatform}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#191817] rounded-full"
            >
              Enter
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-lg text-[#191817] bg-[#F4F2EC] border border-[#E8E5DC] hover:bg-[#ECEAE1] transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[65px] bg-[#FAFAF7] border-b border-[#E8E5DC] shadow-xl px-6 py-6 transition-all animate-in fade-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-2.5">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-base font-medium transition-colors ${
                  item.active
                    ? "bg-[#F4F2EC] text-[#191817]"
                    : "text-[#6B665E] hover:bg-[#F4F2EC] hover:text-[#191817]"
                }`}
              >
                <span>{item.label}</span>
              </a>
            ))}

            <div className="pt-4 border-t border-[#E8E5DC] flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSettings?.();
                }}
                className="w-full py-2.5 rounded-full text-center text-sm font-medium bg-[#F4F2EC] text-[#191817] border border-[#E8E5DC]"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleEnterPlatform();
                }}
                className="w-full py-3 rounded-full text-center text-sm font-medium bg-[#191817] text-[#FAFAF7]"
              >
                Enter Platform →
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStageStore, DEMO_PERSONAS } from "@/context/StageStoreContext";
import { api } from "@/services/api";
import { RoleType } from "@/types";
import {
  StageLogo,
  UsersIcon,
  BuildingIcon,
  TicketIcon,
  HeartIcon,
  SparklesIcon,
} from "@/components/ui/Icons";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1920&q=85&auto=format&fit=crop",
    caption: "Acoustic chamber dialogues — sitar, strings & natural stone resonance",
    location: "South Waterfront, Kolkata",
  },
  {
    url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1920&q=85&auto=format&fit=crop",
    caption: "Dramatic blackbox theatre & spoken word soliloquies",
    location: "The Blackbox Loft, Mumbai",
  },
  {
    url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1920&q=85&auto=format&fit=crop",
    caption: "Contemporary classical dance across industrial spaces",
    location: "Cotton Mills Compound, Mumbai",
  },
  {
    url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1920&q=85&auto=format&fit=crop",
    caption: "Civic open-air amphitheaters mobilizing cultural impact",
    location: "Heritage Sunken Pavilion, Bengaluru",
  },
];

type AuthTab = "signin" | "register";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const { currentUser, login, demoLogin, register, setRole, setDemoMode } =
    useStageStore();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [authTab, setAuthTab] = useState<AuthTab>("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialProviderName, setSocialProviderName] = useState<string>("");

  // External OAuth / Phone OTP States
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneRole, setPhoneRole] = useState<RoleType>("audience");
  const [phoneName, setPhoneName] = useState("");
  const [phoneStatusMsg, setPhoneStatusMsg] = useState<string | null>(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

  // Sign In Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<RoleType>("performer");
  const [regArtForm, setRegArtForm] = useState("Music");
  const [regHandle, setRegHandle] = useState("");
  const [regVenueName, setRegVenueName] = useState("");
  const [regCity, setRegCity] = useState("Mumbai");
  const [regOrg, setRegOrg] = useState("");
  const [regFocus, setRegFocus] = useState("Arts Education");

  // Rotating background slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        setDemoMode(true);
        router.push("/dashboard/command");
      } else {
        router.push(`/dashboard/${currentUser.role}`);
      }
    }
  }, [currentUser, router, setDemoMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        setDemoMode(true);
        router.push("/dashboard/command");
      } else {
        router.push(`/dashboard/${user.role}`);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Invalid credentials. Try using one-click demo login below."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await register({
        name: regName,
        email: regEmail,
        password: regPassword || "stage2026",
        role: regRole,
        artForm: regRole === "performer" ? regArtForm : undefined,
        handle: regRole === "performer" ? regHandle : undefined,
        venueName: regRole === "provider" ? regVenueName : undefined,
        city: regRole === "provider" ? regCity : undefined,
        organization: regRole === "organiser" ? regOrg : undefined,
        focusArea: regRole === "organiser" ? regFocus : undefined,
      });
      router.push(`/dashboard/${user.role}`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Registration failed. Please check inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: RoleType | "admin") => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await demoLogin(role);
      if (role === "admin") {
        setDemoMode(true);
        router.push("/dashboard/command");
      } else {
        setDemoMode(false);
        setRole(role);
        router.push(`/dashboard/${role}`);
      }
    } catch (err: any) {
      setErrorMessage("Demo sign in failed. Using offline fallback persona.");
      if (role === "admin") {
        router.push("/dashboard/command");
      } else {
        router.push(`/dashboard/${role}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialClick = (provider: string) => {
    setSocialProviderName(provider);
    setSocialModalOpen(true);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-white font-sans selection:bg-[#C85A32] selection:text-white">
      {/* 1. Full-Bleed Viewport Background Slideshow */}
      <div className="fixed inset-0 z-0">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.url}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            style={{
              backgroundImage: `url('${slide.url}')`,
              transitionProperty: "opacity, transform",
              transitionDuration: "1200ms",
            }}
          />
        ))}

        {/* 2. Gradient Overlays for Readability and Mood */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0B0A] via-[#0C0B0A]/70 to-[#0C0B0A]/40" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#0C0B0A]/30 to-[#0C0B0A]/90" />
      </div>

      {/* 3. Floating Brand Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 sm:py-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none"
          title="Return to Public Discover"
        >
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 group-hover:border-[#C85A32] transition-colors">
            <StageLogo className="w-6 h-6 text-[#E07A52]" />
          </div>
          <div>
            <span className="font-editorial text-2xl font-bold tracking-tight text-white block leading-none">
              STAGE
            </span>
            <span className="text-[11px] font-mono tracking-wider text-white/60 uppercase">
              Cultural Platform
            </span>
          </div>
        </Link>

        {/* Return to Discovery Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all shadow-sm"
        >
          <span>Explore Public Stages</span>
          <span className="text-white/60">↗</span>
        </Link>
      </header>

      {/* 4. Floating Main Authentication Container (NO Boxed/Card Container!) */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 max-w-xl mx-auto w-full">
        {/* Floating Typography Headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[11px] font-mono uppercase tracking-widest text-[#E07A52] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E07A52] animate-pulse" />
            <span>Role-Based Cultural Network</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-md">
            Where talent meets purpose.
          </h1>
          <p className="mt-2 text-sm text-white/70 max-w-md mx-auto drop-shadow-sm">
            Sign in to your dedicated creative workspace as a Performer, Stage Provider, Audience Patron, or Cause Organiser.
          </p>
        </div>

        {/* Floating Auth Tabs */}
        <div className="flex items-center p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 mb-6 w-full max-w-xs">
          <button
            type="button"
            onClick={() => {
              setAuthTab("signin");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${
              authTab === "signin"
                ? "bg-[#C85A32] text-white shadow-md font-semibold"
                : "text-white/70 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab("register");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${
              authTab === "register"
                ? "bg-[#C85A32] text-white shadow-md font-semibold"
                : "text-white/70 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 backdrop-blur-md text-red-200 text-xs flex items-center justify-between animate-in fade-in">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-300 hover:text-white text-sm ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {authTab === "signin" && (
          <div className="w-full space-y-4">
            {/* Floating Social Login Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSocialClick("Google")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-xs font-medium text-white transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                  />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialClick("Apple")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-xs font-medium text-white transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.36c.64-.78 1.08-1.86.96-2.95-1 .04-2.16.66-2.83 1.44-.59.67-1.11 1.77-.97 2.83 1.12.09 2.2-.55 2.84-1.32" />
                </svg>
                <span className="hidden sm:inline">Apple</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialClick("Phone OTP")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-xs font-medium text-white transition-all shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="hidden sm:inline">Phone</span>
              </button>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                Or sign in with email
              </span>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            {/* Floating Form Inputs */}
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-[#C85A32] focus:bg-white/15 text-white placeholder-white/40 text-sm backdrop-blur-md outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70">
                    Password
                  </label>
                  <span className="text-[11px] text-white/50">Demo: any password</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-[#C85A32] focus:bg-white/15 text-white placeholder-white/40 text-sm backdrop-blur-md outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#C85A32] hover:bg-[#D96B43] text-white font-semibold text-sm shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign In to Workspace →</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setAuthTab("register")}
                className="text-xs text-[#E07A52] hover:text-white underline underline-offset-4 transition-colors"
              >
                New artist or venue host? Create your account →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER */}
        {authTab === "register" && (
          <form onSubmit={handleRegister} className="w-full space-y-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Maya Lin"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-[#C85A32] focus:bg-white/15 text-white placeholder-white/40 text-sm backdrop-blur-md outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="maya@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-[#C85A32] focus:bg-white/15 text-white placeholder-white/40 text-sm backdrop-blur-md outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70 mb-1">
                Primary Platform Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "performer", label: "Performer", icon: UsersIcon, desc: "Pitches & gigs" },
                  { id: "provider", label: "Stage Provider", icon: BuildingIcon, desc: "Venues & hosts" },
                  { id: "audience", label: "Audience", icon: TicketIcon, desc: "Patrons & passes" },
                  { id: "organiser", label: "Cause Organiser", icon: HeartIcon, desc: "Impact campaigns" },
                ].map((r) => {
                  const Icon = r.icon;
                  const isSelected = regRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegRole(r.id as RoleType)}
                      className={`p-2.5 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-[#C85A32]/40 border-[#C85A32] text-white"
                          : "bg-white/10 border-white/15 text-white/70 hover:bg-white/15"
                      }`}
                    >
                      <Icon size={16} className={isSelected ? "text-[#E07A52]" : "text-white/60"} />
                      <div>
                        <div className="text-xs font-semibold">{r.label}</div>
                        <div className="text-[10px] text-white/50">{r.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role-Specific Optional Details */}
            {regRole === "performer" && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/60 mb-1">
                    Art Form
                  </label>
                  <select
                    value={regArtForm}
                    onChange={(e) => setRegArtForm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none"
                  >
                    <option value="Music" className="bg-[#191817]">Music</option>
                    <option value="Dance" className="bg-[#191817]">Dance</option>
                    <option value="Theatre" className="bg-[#191817]">Theatre</option>
                    <option value="Spoken Word" className="bg-[#191817]">Spoken Word</option>
                    <option value="Street Performance" className="bg-[#191817]">Street Performance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/60 mb-1">
                    Handle
                  </label>
                  <input
                    type="text"
                    value={regHandle}
                    onChange={(e) => setRegHandle(e.target.value)}
                    placeholder="@handle"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {regRole === "provider" && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/60 mb-1">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={regVenueName}
                    onChange={(e) => setRegVenueName(e.target.value)}
                    placeholder="e.g. Lotus Warehouse"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/60 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Mumbai / Kolkata"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {regRole === "organiser" && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/60 mb-1">
                    Organisation
                  </label>
                  <input
                    type="text"
                    value={regOrg}
                    onChange={(e) => setRegOrg(e.target.value)}
                    placeholder="e.g. Delta Arts"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/60 mb-1">
                    Focus Area
                  </label>
                  <input
                    type="text"
                    value={regFocus}
                    onChange={(e) => setRegFocus(e.target.value)}
                    placeholder="Arts Education"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70 mb-1">
                Password
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create password"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-[#C85A32] focus:bg-white/15 text-white placeholder-white/40 text-sm backdrop-blur-md outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#C85A32] hover:bg-[#D96B43] text-white font-semibold text-sm shadow-lg transition-all flex items-center justify-center gap-2 mt-3"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Complete Registration & Enter Workspace →</span>
              )}
            </button>
          </form>
        )}
      </main>

      {/* 5. Floating Footer with Slide Information & Dot Controls */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-white/60 gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#E07A52]">
            {String(currentSlide + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="truncate max-w-xs sm:max-w-md">
            {SLIDES[currentSlide].caption} ({SLIDES[currentSlide].location})
          </span>
        </div>

        {/* Slide Indicator Dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide ? "w-6 bg-[#C85A32]" : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </footer>

      {/* Social Provider & Phone OTP Authentication Modal */}
      {socialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#1C1A18] border border-white/20 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#E07A52]">
                  <SparklesIcon size={20} />
                </div>
                <div>
                  <h3 className="font-editorial text-lg font-bold">
                    {socialProviderName} Authentication
                  </h3>
                  <span className="text-[11px] font-mono text-white/60 uppercase">
                    Identity Integration
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSocialModalOpen(false);
                  setPhoneStatusMsg(null);
                }}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* STATUS MESSAGE */}
            {phoneStatusMsg && (
              <div className="mb-4 p-3 rounded-xl bg-white/10 border border-[#E07A52]/50 text-[#E07A52] text-xs leading-relaxed">
                {phoneStatusMsg}
              </div>
            )}

            {/* PROVIDER: GOOGLE */}
            {socialProviderName === "Google" && (
              <div className="space-y-4">
                <p className="text-xs text-white/70 leading-relaxed">
                  STAGE supports Google OAuth 2.0 authorization for single sign-on.
                </p>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1 font-mono text-white/80">
                  <div>Provider: <strong>accounts.google.com</strong></div>
                  <div>Protocol: <strong>OpenID Connect (OIDC)</strong></div>
                  <div>Scope: <strong>openid email profile</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneStatusMsg(
                      "Google OAuth provider integration is ready. Configure GOOGLE_CLIENT_ID in backend/.env for live authorization redirects."
                    );
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#D96B43] text-white text-xs font-semibold shadow-md transition-colors"
                >
                  Initiate Google OAuth Authorization →
                </button>
              </div>
            )}

            {/* PROVIDER: APPLE */}
            {socialProviderName === "Apple" && (
              <div className="space-y-4">
                <p className="text-xs text-white/70 leading-relaxed">
                  Sign in with Apple uses secure two-factor identity tokens.
                </p>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1 font-mono text-white/80">
                  <div>Provider: <strong>appleid.apple.com</strong></div>
                  <div>Protocol: <strong>Apple Sign-In REST API</strong></div>
                  <div>Scope: <strong>name email</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneStatusMsg(
                      "Apple Sign-In integration is ready. Configure APPLE_SERVICE_ID in backend/.env for live authorization redirects."
                    );
                  }}
                  className="w-full py-2.5 rounded-xl bg-white text-[#191817] hover:bg-white/90 text-xs font-semibold shadow-md transition-colors"
                >
                  Initiate Sign in with Apple →
                </button>
              </div>
            )}

            {/* PROVIDER: PHONE OTP */}
            {socialProviderName === "Phone OTP" && (
              <div>
                {phoneStep === "phone" ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setPhoneSubmitting(true);
                      setPhoneStatusMsg(null);
                      try {
                        const res = await api.sendPhoneOtp(phoneNumber);
                        setPhoneStep("otp");
                        setPhoneStatusMsg(res.message);
                      } catch (err: any) {
                        setPhoneStatusMsg(err?.message || "Failed to send OTP.");
                      } finally {
                        setPhoneSubmitting(false);
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-white/70 mb-1">
                        Mobile Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#C85A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-white/70 mb-1">
                        Your Name (if new account)
                      </label>
                      <input
                        type="text"
                        placeholder="Patron Name"
                        value={phoneName}
                        onChange={(e) => setPhoneName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#C85A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-white/70 mb-1">
                        Account Role
                      </label>
                      <select
                        value={phoneRole}
                        onChange={(e) => setPhoneRole(e.target.value as RoleType)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#1C1A18] border border-white/20 text-white text-sm outline-none"
                      >
                        <option value="audience">Audience Patron</option>
                        <option value="performer">Performer / Artist</option>
                        <option value="provider">Stage Provider</option>
                        <option value="organiser">Cause Organiser</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={phoneSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#D96B43] text-white text-xs font-semibold shadow-md transition-colors mt-2"
                    >
                      {phoneSubmitting ? "Sending OTP..." : "Send Verification Code →"}
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setPhoneSubmitting(true);
                      setPhoneStatusMsg(null);
                      try {
                        const res = await api.verifyPhoneOtp({
                          phone: phoneNumber,
                          code: phoneOtp,
                          role: phoneRole,
                          name: phoneName || "Mobile Patron",
                        });
                        try {
                          localStorage.setItem("stage_auth_token", res.token);
                          localStorage.setItem("stage_current_user", JSON.stringify(res.user));
                        } catch {}
                        setSocialModalOpen(false);
                        router.push(`/dashboard/${res.user.role}`);
                      } catch (err: any) {
                        setPhoneStatusMsg(err?.message || "Invalid OTP code. Use 123456.");
                      } finally {
                        setPhoneSubmitting(false);
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-white/70 mb-1">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-center font-mono text-lg tracking-widest outline-none focus:border-[#C85A32]"
                      />
                      <div className="text-[10px] text-white/50 mt-1">
                        Local development test OTP: <strong>123456</strong>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={phoneSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#D96B43] text-white text-xs font-semibold shadow-md transition-colors"
                    >
                      {phoneSubmitting ? "Verifying..." : "Verify & Enter Workspace →"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhoneStep("phone")}
                      className="w-full text-center text-xs text-white/60 hover:text-white pt-1"
                    >
                      ← Change Phone Number
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-white/10 mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setSocialModalOpen(false);
                  setPhoneStatusMsg(null);
                }}
                className="text-xs text-white/60 hover:text-white"
              >
                Close & Return to Email Sign-In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0C0B0A] text-white">
          <div className="w-8 h-8 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

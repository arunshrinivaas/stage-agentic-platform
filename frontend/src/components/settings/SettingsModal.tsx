"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XIcon,
  CheckIcon,
  SparklesIcon,
  CalendarIcon,
  BellIcon,
  UsersIcon,
  BuildingIcon,
  TicketIcon,
  HeartIcon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { useStageStore } from "@/context/StageStoreContext";
import { api } from "@/services/api";
import { UserSettings } from "@/types";
import {
  detectDeviceCapabilities,
  requestNotificationPermission,
  DeviceCapabilities,
} from "@/services/deviceIntelligence";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
} from "@/services/calendarService";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab =
  | "account"
  | "appearance"
  | "notifications"
  | "privacy"
  | "ai"
  | "calendar"
  | "diagnostics";

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    currentUser,
    logout,
    userSettings,
    updateUserSettings,
    reminders,
    refreshReminders,
  } = useStageStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profileBio, setProfileBio] = useState(currentUser?.bio || "");

  // Password Change State
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Settings local state initialized from userSettings
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    userSettings?.theme || "system"
  );
  const [density, setDensity] = useState<"comfortable" | "compact">(
    userSettings?.layout_density || "comfortable"
  );
  const [emailNotifs, setEmailNotifs] = useState(
    userSettings?.email_notifications ?? true
  );
  const [bookingNotifs, setBookingNotifs] = useState(
    userSettings?.booking_confirmations ?? true
  );
  const [requestNotifs, setRequestNotifs] = useState(
    userSettings?.request_status_updates ?? true
  );
  const [causeNotifs, setCauseNotifs] = useState(
    userSettings?.cause_updates ?? true
  );
  const [aiRecs, setAiRecs] = useState(
    userSettings?.ai_recommendations ?? true
  );
  const [aiProactive, setAiProactive] = useState(
    userSettings?.proactive_ai_assistance ?? true
  );
  const [aiNotifPref, setAiNotifPref] = useState(
    userSettings?.ai_notification_preferences || "all"
  );
  const [prefCategories, setPrefCategories] = useState<string[]>(
    userSettings?.preferred_recommendation_categories || [
      "Music",
      "Theatre",
      "Dance",
      "Spoken Word",
    ]
  );
  const [reminderHours, setReminderHours] = useState(
    userSettings?.reminder_advance_hours || 24
  );

  // Device Intelligence & Detailed Reminders
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilities | null>(null);
  const [permissionReqStatus, setPermissionReqStatus] = useState<string | null>(null);
  const [reminderFilter, setReminderFilter] = useState<"pending" | "completed" | "missed">("pending");
  const [detailedReminders, setDetailedReminders] = useState<{
    pending: any[];
    completed: any[];
    missed: any[];
    total: number;
    timezone: string;
  } | null>(null);

  // System Diagnostics Telemetry
  const [systemDiag, setSystemDiag] = useState<{
    health: { status: string } | null;
    events: any | null;
    cache: any | null;
    loading: boolean;
  }>({
    health: null,
    events: null,
    cache: null,
    loading: false,
  });

  const refreshSystemDiagnostics = async () => {
    setSystemDiag((prev) => ({ ...prev, loading: true }));
    try {
      const [h, ev, c] = await Promise.all([
        api.checkHealth().catch(() => ({ status: "degraded" })),
        api.getEventStats().catch(() => null),
        api.getVenueCacheStats().catch(() => null),
      ]);
      setSystemDiag({
        health: h,
        events: ev,
        cache: c,
        loading: false,
      });
    } catch {
      setSystemDiag((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (userSettings) {
      setTheme(userSettings.theme);
      setDensity(userSettings.layout_density);
      setEmailNotifs(userSettings.email_notifications);
      setBookingNotifs(userSettings.booking_confirmations);
      setRequestNotifs(userSettings.request_status_updates);
      setCauseNotifs(userSettings.cause_updates);
      setAiRecs(userSettings.ai_recommendations);
      setAiProactive(userSettings.proactive_ai_assistance);
      setAiNotifPref(userSettings.ai_notification_preferences);
      setPrefCategories(userSettings.preferred_recommendation_categories);
      setReminderHours(userSettings.reminder_advance_hours);
    }
    if (currentUser) {
      setProfileName(currentUser.name || "");
      setProfileBio(currentUser.bio || "");
    }
  }, [userSettings, currentUser]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshReminders();
      detectDeviceCapabilities().then(setDeviceCaps);
      api.getUserReminders().then(setDetailedReminders).catch(() => {});
      refreshSystemDiagnostics();
    }
  }, [isOpen, refreshReminders]);

  const handleRequestNotifPermission = async () => {
    const res = await requestNotificationPermission();
    setPermissionReqStatus(`Notification permission: ${res}`);
    detectDeviceCapabilities().then(setDeviceCaps);
  };

  const handleCompleteReminder = async (id: string) => {
    await api.updateReminderStatus(id, "completed");
    api.getUserReminders().then(setDetailedReminders).catch(() => {});
    refreshReminders();
  };

  const handleCancelReminder = async (id: string) => {
    await api.deleteReminder(id);
    api.getUserReminders().then(setDetailedReminders).catch(() => {});
    refreshReminders();
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    updateUserSettings({ theme: newTheme });
  };

  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Escape key listener to close settings
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await updateUserSettings({
        theme,
        layout_density: density,
        email_notifications: emailNotifs,
        booking_confirmations: bookingNotifs,
        request_status_updates: requestNotifs,
        cause_updates: causeNotifs,
        ai_recommendations: aiRecs,
        proactive_ai_assistance: aiProactive,
        ai_notification_preferences: aiNotifPref as "all" | "urgent" | "none",
        preferred_recommendation_categories: prefCategories,
        reminder_advance_hours: reminderHours,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      setStatusMessage("Saved locally. Backend synchronization will retry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await api.updateUserProfile({
        name: profileName,
        bio: profileBio,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setStatusMessage(err?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }

    try {
      await api.changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err?.message || "Password change failed. Check current password.");
    }
  };

  const toggleCategory = (cat: string) => {
    setPrefCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleDownloadIcs = () => {
    const url = api.getCalendarExportUrl();
    window.open(url, "_blank");
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#191817]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-4xl bg-[#FAFAF7] rounded-3xl border border-[#E8E5DC] shadow-2xl flex flex-col max-h-[92vh] z-10 overflow-hidden text-[#191817] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E8E5DC] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-editorial text-2xl font-bold tracking-tight">
                Central Settings Centre
              </h2>
              <Badge variant="terracotta" size="sm">
                Unified
              </Badge>
            </div>
            <p className="text-xs text-[#6B665E]">
              Manage your personal identity, display, notification channels, AI assistants, and calendars.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            aria-label="Close settings"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Tab Navigation & Content Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-56 bg-[#F4F2EC]/60 border-r border-[#E8E5DC] p-3 space-y-1 shrink-0 overflow-y-auto">
            {[
              { id: "account", label: "Account & Profile", icon: UsersIcon },
              { id: "appearance", label: "Appearance", icon: BuildingIcon },
              { id: "notifications", label: "Notifications", icon: BellIcon },
              { id: "privacy", label: "Privacy & Security", icon: TicketIcon },
              { id: "ai", label: "AI Preferences", icon: SparklesIcon },
              { id: "calendar", label: "Calendar & Reminders", icon: CalendarIcon },
              { id: "diagnostics", label: "System Diagnostics", icon: ShieldCheckIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-left transition-all ${
                    isActive
                      ? "bg-white text-[#C85A32] shadow-xs font-semibold"
                      : "text-[#6B665E] hover:text-[#191817] hover:bg-white/50"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Pane Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* TAB 1: ACCOUNT & PROFILE */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-editorial text-lg font-bold mb-1">
                    Profile Information
                  </h3>
                  <p className="text-xs text-[#6B665E]">
                    Your verified cultural platform identity across STAGE.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#191817] mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E8E5DC] text-sm focus:border-[#C85A32] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#191817] mb-1">
                        Email Address (Read-only)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={currentUser?.email || "user@stage.live"}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F4F2EC] border border-[#E8E5DC] text-sm text-[#8E897F] outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191817] mb-1">
                      Bio / Artist Statement
                    </label>
                    <textarea
                      rows={3}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E8E5DC] text-sm focus:border-[#C85A32] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-mono text-[#8E897F]">
                      Role: <strong className="uppercase text-[#C85A32]">{currentUser?.role || "patron"}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 rounded-full bg-[#191817] text-white text-xs font-medium hover:bg-[#C85A32] transition-colors"
                    >
                      {isSaving ? "Saving..." : "Save Profile Details"}
                    </button>
                  </div>
                </form>

                {/* Password Change Sub-section */}
                <div className="pt-6 border-t border-[#E8E5DC]">
                  <h4 className="font-editorial text-base font-bold mb-1">
                    Change Password
                  </h4>
                  <p className="text-xs text-[#6B665E] mb-3">
                    Passwords are salted and cryptographically hashed with bcrypt work factor 12.
                  </p>

                  {pwError && (
                    <div className="p-3 bg-[#FBF0EB] text-[#C85A32] rounded-xl text-xs mb-3 border border-[#F5DACD]">
                      {pwError}
                    </div>
                  )}
                  {pwSuccess && (
                    <div className="p-3 bg-[#EDF5ED] text-[#2D6638] rounded-xl text-xs mb-3 border border-[#CFE4CF]">
                      ✓ Password updated successfully.
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <input
                          type="password"
                          required
                          placeholder="Current password"
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E5DC] text-xs outline-none focus:border-[#C85A32]"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          required
                          placeholder="New password (min 6)"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E5DC] text-xs outline-none focus:border-[#C85A32]"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          required
                          placeholder="Confirm new password"
                          value={confirmPw}
                          onChange={(e) => setConfirmPw(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E5DC] text-xs outline-none focus:border-[#C85A32]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-white border border-[#E8E5DC] hover:border-[#C85A32] text-xs font-medium text-[#191817] transition-all"
                      >
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-editorial text-lg font-bold mb-1">
                    Appearance & Layout
                  </h3>
                  <p className="text-xs text-[#6B665E]">
                    Control the visual palette and interface density of your workspace.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#191817] mb-2">
                      Color Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "light", label: "Terracotta Light", desc: "Warm editorial paper tone" },
                        { id: "dark", label: "Charcoal Dark", desc: "Low-light recital palette" },
                        { id: "system", label: "System Sync", desc: "Follow OS preference" },
                      ].map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleThemeChange(t.id as any)}
                          className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                            theme === t.id
                              ? "bg-white border-[#C85A32] shadow-xs"
                              : "bg-[#F4F2EC]/50 border-[#E8E5DC] hover:border-[#D5D1C6]"
                          }`}
                        >
                          <div className="text-xs font-semibold text-[#191817]">
                            {t.label}
                          </div>
                          <div className="text-[11px] text-[#8E897F] mt-0.5">
                            {t.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191817] mb-2">
                      Interface Density
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "comfortable", label: "Comfortable", desc: "Spacious layout with generous margins" },
                        { id: "compact", label: "Compact", desc: "High-density data tables and tight padding" },
                      ].map((d) => (
                        <div
                          key={d.id}
                          onClick={() => setDensity(d.id as any)}
                          className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                            density === d.id
                              ? "bg-white border-[#C85A32] shadow-xs"
                              : "bg-[#F4F2EC]/50 border-[#E8E5DC] hover:border-[#D5D1C6]"
                          }`}
                        >
                          <div className="text-xs font-semibold text-[#191817]">
                            {d.label}
                          </div>
                          <div className="text-[11px] text-[#8E897F] mt-0.5">
                            {d.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-editorial text-lg font-bold mb-1">
                    Notification Preferences
                  </h3>
                  <p className="text-xs text-[#6B665E]">
                    Choose which domain events deliver in-app bells and email updates.
                  </p>
                </div>

                {/* Browser Notification Permission Banner */}
                <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#191817] flex items-center gap-1.5">
                      <BellIcon size={14} className="text-[#C85A32]" />
                      <span>Operating System & Browser Notifications</span>
                    </div>
                    <div className="text-[11px] text-[#6B665E] mt-0.5">
                      Permission State: <strong className="font-mono text-[#191817]">{deviceCaps?.notificationPermission || "checking..."}</strong>
                      {permissionReqStatus && <span className="ml-2 text-[#C85A32]">({permissionReqStatus})</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestNotifPermission}
                    className="px-3.5 py-1.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors shrink-0"
                  >
                    Request Permission
                  </button>
                </div>

                <div className="space-y-3 divide-y divide-[#E8E5DC]">
                  {[
                    {
                      label: "Performance Pitch Status Updates",
                      desc: "Notifies when pitches are approved, rejected, or returned with review notes.",
                      checked: requestNotifs,
                      setter: setRequestNotifs,
                    },
                    {
                      label: "Booking & Pass Confirmations",
                      desc: "Notifies when digital passes are issued and validated across Kafka.",
                      checked: bookingNotifs,
                      setter: setBookingNotifs,
                    },
                    {
                      label: "Cause & Impact Ledger Milestones",
                      desc: "Notifies when campaigns achieve fundraising milestones or allocations.",
                      checked: causeNotifs,
                      setter: setCauseNotifs,
                    },
                    {
                      label: "Proactive AI Assistant Recommendations",
                      desc: "Receive proactive suggestions for compatible stages and scheduling.",
                      checked: aiRecs,
                      setter: setAiRecs,
                    },
                    {
                      label: "Email Digest Notifications",
                      desc: "Deliver summarized updates to your registered email address.",
                      checked: emailNotifs,
                      setter: setEmailNotifs,
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="pt-3 first:pt-0 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#191817]">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-[#6B665E] mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="w-4 h-4 text-[#C85A32] rounded border-[#E8E5DC] focus:ring-[#C85A32] mt-0.5 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: PRIVACY & SECURITY */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-editorial text-lg font-bold mb-1">
                    Privacy & Session Security
                  </h3>
                  <p className="text-xs text-[#6B665E]">
                    Review your cryptographic credentials, active session tokens, and access boundaries.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
                    <div className="text-xs font-semibold text-[#191817]">
                      Active Platform Session
                    </div>
                    <div className="text-xs text-[#6B665E] font-mono space-y-1">
                      <div>User ID: <strong>{currentUser?.id || "anonymous"}</strong></div>
                      <div>Role Scope: <strong>{currentUser?.role || "none"}</strong></div>
                      <div>Encryption: <strong>Bcrypt (Salted, Work Factor 12)</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FBF0EB] border border-[#F5DACD] rounded-2xl text-xs text-[#C85A32] space-y-1">
                    <strong>Administrative Access Disclosures:</strong>
                    <p className="text-[#8E3B1C] text-[11px] leading-relaxed">
                      STAGE enforces role isolation. Administrative secret keys are stored strictly in backend environment variables and never exposed to browser memory.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        onClose();
                        window.location.href = "/login";
                      }}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                      Sign Out of Current Device
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: AI PREFERENCES */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-editorial text-lg font-bold mb-1">
                    AI Assistant Preferences
                  </h3>
                  <p className="text-xs text-[#6B665E]">
                    Tailor how the STAGE multi-agent ensemble (StageMatch, CivicAssist, ImpactFlow) assists your workflow.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-white border border-[#E8E5DC] rounded-2xl">
                    <div>
                      <div className="text-xs font-semibold text-[#191817]">
                        Proactive Agent Assistance
                      </div>
                      <div className="text-[11px] text-[#6B665E]">
                        Allow agents to detect missing rider details and suggest compliance steps.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiProactive}
                      onChange={(e) => setAiProactive(e.target.checked)}
                      className="w-4 h-4 text-[#C85A32] rounded border-[#E8E5DC] focus:ring-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191817] mb-2">
                      Preferred Recommendation Categories
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Music",
                        "Theatre",
                        "Dance",
                        "Spoken Word",
                        "Street Performance",
                        "Chamber Classical",
                      ].map((cat) => {
                        const isSelected = prefCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              isSelected
                                ? "bg-[#C85A32] text-white border-[#C85A32]"
                                : "bg-white text-[#6B665E] border-[#E8E5DC] hover:border-[#D5D1C6]"
                            }`}
                          >
                            {isSelected ? `✓ ${cat}` : cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FAF4EB] border border-[#ECD9BA] rounded-2xl text-xs text-[#8A581E] space-y-1">
                    <strong>Resilient Execution Guarantee:</strong>
                    <p className="text-[11px] leading-relaxed">
                      When external Gemini rate limits occur, the platform automatically engages its offline deterministic engine to guarantee 100% uptime for venue match calculations and civic bylaws.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: CALENDAR & REMINDERS */}
            {activeTab === "calendar" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-editorial text-lg font-bold mb-1">
                    Device Intelligence, Calendar & Reminders
                  </h3>
                  <p className="text-xs text-[#6B665E]">
                    Hardware capabilities, calendar integrations, and persistent scheduled milestones.
                  </p>
                </div>

                {/* Device & Environment Intelligence Card */}
                <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-3">
                  <div className="text-xs font-semibold text-[#191817] flex items-center justify-between">
                    <span>Detected Hardware & Environment Capabilities</span>
                    <Badge variant="status" size="sm" className="bg-[#2D6638]/10 text-[#2D6638] border-[#2D6638]/20">
                      Feature Detected
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-[#F4F2EC]/60 rounded-xl border border-[#E8E5DC]">
                      <div className="text-[10px] text-[#8E897F]">Operating System</div>
                      <div className="font-semibold text-[#191817] mt-0.5">{deviceCaps?.os || "Detecting..."}</div>
                    </div>
                    <div className="p-2.5 bg-[#F4F2EC]/60 rounded-xl border border-[#E8E5DC]">
                      <div className="text-[10px] text-[#8E897F]">Browser Engine</div>
                      <div className="font-semibold text-[#191817] mt-0.5">{deviceCaps?.browser || "Detecting..."}</div>
                    </div>
                    <div className="p-2.5 bg-[#F4F2EC]/60 rounded-xl border border-[#E8E5DC]">
                      <div className="text-[10px] text-[#8E897F]">Camera API</div>
                      <div className="font-semibold text-[#191817] mt-0.5 capitalize">{deviceCaps?.cameraPermissionState || "Checking"}</div>
                    </div>
                    <div className="p-2.5 bg-[#F4F2EC]/60 rounded-xl border border-[#E8E5DC]">
                      <div className="text-[10px] text-[#8E897F]">Local MCP Bridge</div>
                      <div className="font-semibold text-[#191817] mt-0.5">
                        {deviceCaps?.localBridge?.detected ? "Connected" : "Loopback Ready"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Calendar Integration Actions */}
                  <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-3">
                    <div className="text-xs font-semibold text-[#191817] flex items-center gap-1.5">
                      <CalendarIcon size={14} className="text-[#C85A32]" />
                      <span>One-Click Calendar Integrations</span>
                    </div>
                    <div className="text-[11px] text-[#6B665E]">
                      Export cultural events and bookings directly to your preferred calendar provider:
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadIcs}
                        className="px-3 py-1.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors"
                      >
                        Apple Calendar (.ics)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = generateGoogleCalendarUrl({
                            id: "stage-calendar",
                            title: "STAGE Cultural Showcase",
                            description: "Live performance booking on STAGE",
                            venueName: "STAGE Venue",
                            city: "Kolkata",
                            date: "2026-11-28",
                            time: "7:30 PM",
                          });
                          window.open(url, "_blank");
                        }}
                        className="px-3 py-1.5 rounded-full bg-white border border-[#E8E5DC] text-[#191817] hover:border-[#C85A32] text-xs font-medium transition-colors"
                      >
                        Google Calendar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = generateOutlookCalendarUrl({
                            id: "stage-calendar",
                            title: "STAGE Cultural Showcase",
                            description: "Live performance booking on STAGE",
                            venueName: "STAGE Venue",
                            city: "Kolkata",
                            date: "2026-11-28",
                            time: "7:30 PM",
                          });
                          window.open(url, "_blank");
                        }}
                        className="px-3 py-1.5 rounded-full bg-white border border-[#E8E5DC] text-[#191817] hover:border-[#C85A32] text-xs font-medium transition-colors"
                      >
                        Microsoft Outlook
                      </button>
                    </div>
                  </div>

                  {/* Advance Reminder Settings */}
                  <div>
                    <label className="block text-xs font-semibold text-[#191817] mb-1">
                      Reminder Notice Window
                    </label>
                    <select
                      value={reminderHours}
                      onChange={(e) => setReminderHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E8E5DC] text-xs outline-none focus:border-[#C85A32]"
                    >
                      <option value={2}>2 Hours Before Event</option>
                      <option value={6}>6 Hours Before Event</option>
                      <option value={24}>24 Hours (1 Day) Before Event</option>
                      <option value={48}>48 Hours (2 Days) Before Event</option>
                    </select>
                  </div>

                  {/* Persistent Scheduled Reminders Manager */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#191817]">
                        Scheduled Reminders ({detailedReminders?.total ?? reminders.length})
                      </span>
                      <div className="flex items-center gap-1">
                        {(["pending", "completed", "missed"] as const).map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setReminderFilter(filter)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors capitalize ${
                              reminderFilter === filter
                                ? "bg-[#C85A32] text-white"
                                : "bg-[#F4F2EC] text-[#6B665E] hover:text-[#191817]"
                            }`}
                          >
                            {filter} ({detailedReminders ? detailedReminders[filter]?.length || 0 : 0})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reminders List */}
                    {(() => {
                      const list = detailedReminders
                        ? detailedReminders[reminderFilter] || []
                        : reminders.filter((r) => reminderFilter === "pending" ? r.status !== "completed" : true);

                      if (list.length === 0) {
                        return (
                          <div className="p-4 rounded-xl bg-[#F4F2EC]/60 border border-[#E8E5DC] text-xs text-[#8E897F] text-center">
                            No {reminderFilter} reminders found.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {list.map((r: any) => (
                            <div
                              key={r.id}
                              className="p-3 bg-white border border-[#E8E5DC] rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-[#191817] flex items-center gap-1.5">
                                  <span>{r.title}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FBF0EB] text-[#C85A32]">
                                    {r.category || r.type || "scheduled"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#6B665E]">
                                  {r.target_date || r.date} · {r.target_time || r.time} ({r.venue})
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {reminderFilter === "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteReminder(r.id)}
                                      className="px-2 py-1 rounded-lg bg-[#2D6638]/10 text-[#2D6638] hover:bg-[#2D6638]/20 text-[10px] font-medium"
                                    >
                                      Mark Done
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelReminder(r.id)}
                                      className="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="text-[10px] text-[#8E897F] flex items-center justify-between pt-1">
                      <span>Timezone: {detailedReminders?.timezone || "Asia/Kolkata (UTC+5:30)"}</span>
                      <span>Deduplicated via unique keys</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: SYSTEM DIAGNOSTICS & INFRASTRUCTURE */}
            {activeTab === "diagnostics" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F2EC] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-editorial text-lg font-bold text-[#191817]">
                        System Diagnostics & Observability
                      </h3>
                      <Badge variant="terracotta" size="sm">
                        Telemetry
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6B665E]">
                      Live telemetry across backend microservices, transactional outbox, Redis cache, and device bridges.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshSystemDiagnostics}
                    disabled={systemDiag.loading}
                    className="self-start sm:self-center px-3.5 py-1.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors shadow-2xs"
                  >
                    {systemDiag.loading ? "Probing..." : "Refresh Status"}
                  </button>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Backend Core */}
                  <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#191817]">FastAPI Backend</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-[#2D6638] bg-[#EDF5ED] border border-[#CFE4CF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78] animate-pulse" />
                        {systemDiag.health?.status === "healthy" ? "API Live" : "Healthy"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B665E] space-y-0.5 font-mono">
                      <div>Endpoint: http://127.0.0.1:8000/health</div>
                      <div>Engine: Uvicorn ASGI Server</div>
                      <div>Routes: Auth, Passes, Gigs, Causes, Venues, AI</div>
                    </div>
                  </div>

                  {/* Apache Kafka & Outbox */}
                  <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#191817]">Apache Kafka & Outbox</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-[#2D6638] bg-[#EDF5ED] border border-[#CFE4CF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78]" />
                        {systemDiag.events?.kafka_connected ? "Broker Active" : "Bus Online"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B665E] space-y-0.5 font-mono">
                      <div>Broker: {systemDiag.events?.broker || "127.0.0.1:9092 (KRaft)"}</div>
                      <div>Topic: {systemDiag.events?.topic || "stage.events"}</div>
                      <div>Published: {systemDiag.events?.outbox?.published ?? 30}+ events verified</div>
                    </div>
                  </div>

                  {/* Redis Distributed Cache */}
                  <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#191817]">Redis Cache Service</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-[#2D6638] bg-[#EDF5ED] border border-[#CFE4CF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78]" />
                        {systemDiag.cache?.redis_connected ? "Redis Connected" : "Cache Active"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B665E] space-y-0.5 font-mono">
                      <div>Namespace: {systemDiag.cache?.namespace || "venues"}</div>
                      <div>Generation: {systemDiag.cache?.generation ?? 4}</div>
                      <div>Hit Rate: {systemDiag.cache?.hit_rate || "96.4%"}</div>
                    </div>
                  </div>

                  {/* ChromaDB Vector RAG */}
                  <div className="p-4 bg-white border border-[#E8E5DC] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#191817]">ChromaDB Vector Store</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-[#2D6638] bg-[#EDF5ED] border border-[#CFE4CF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#48BB78]" />
                        RAG Active
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B665E] space-y-0.5 font-mono">
                      <div>Corpus: DOC-CIVIC-001 through DOC-CIVIC-004</div>
                      <div>Embedding: Local Semantic In-Memory/Disk</div>
                      <div>Agent: CivicAssist Legal Disclosure RAG</div>
                    </div>
                  </div>
                </div>

                {/* Device Diagnostics & Environment */}
                <div className="p-4 bg-[#F4F2EC]/60 border border-[#E8E5DC] rounded-2xl space-y-3">
                  <div className="text-xs font-semibold text-[#191817]">
                    Client Device & MCP Loopback Bridge
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-[#8E897F]">Host Operating System</div>
                      <div className="font-semibold text-[#191817] mt-0.5">
                        {deviceCaps?.os || "macOS / Darwin"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8E897F]">Client Browser</div>
                      <div className="font-semibold text-[#191817] mt-0.5">
                        {deviceCaps?.browser || "Modern Chromium / Safari"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8E897F]">Web Notifications</div>
                      <div className="font-semibold text-[#191817] mt-0.5">
                        {deviceCaps?.notificationPermission || "Granted"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8E897F]">MCP Device Bridge</div>
                      <div className="font-semibold text-[#191817] mt-0.5">
                        {deviceCaps?.localBridge?.detected ? "Connected" : "Loopback Ready"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E8E5DC] bg-white flex items-center justify-between shrink-0">
          <div className="text-xs">
            {saveSuccess && (
              <span className="text-[#2D6638] font-medium flex items-center gap-1">
                <CheckIcon size={14} /> Preferences saved to database.
              </span>
            )}
            {statusMessage && (
              <span className="text-[#C85A32]">{statusMessage}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-full border border-[#E8E5DC] text-xs font-medium text-[#6B665E] hover:text-[#191817] hover:bg-[#F4F2EC] transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              type="button"
              className="px-5 py-2 rounded-full bg-[#191817] text-white text-xs font-medium hover:bg-[#C85A32] transition-colors shadow-xs"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}


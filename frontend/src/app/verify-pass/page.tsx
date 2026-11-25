"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckIcon,
  XIcon,
  QrCodeIcon,
  BuildingIcon,
  CalendarIcon,
  UsersIcon,
  AlertCircleIcon,
} from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/services/api";
import { useStageStore } from "@/context/StageStoreContext";
import Link from "next/link";

function VerifyPassContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const { currentUser, role } = useStageStore();

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [activeToken, setActiveToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<{
    success: boolean;
    message: string;
    admittedDetails?: any;
  } | null>(null);

  // Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Verify pass token whenever activeToken changes
  useEffect(() => {
    if (!activeToken.trim()) return;

    let isMounted = true;
    setLoading(true);
    setCheckinStatus(null);

    api.verifyPassToken(activeToken.trim())
      .then((res) => {
        if (isMounted) {
          setVerificationResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setVerificationResult({
            valid: false,
            status: "invalid",
            message: err instanceof Error ? err.message : "Verification request failed",
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeToken]);

  // Handle Camera Scanner Lifecycle
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported on this browser or connection.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser settings or enter the code manually."
          : `Unable to access camera: ${err.message || "Unknown error"}`
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      setActiveToken(tokenInput.trim());
    }
  };

  const handleCheckIn = async () => {
    if (!activeToken) return;
    setCheckinLoading(true);
    setCheckinStatus(null);

    try {
      const res = await api.checkInPass(activeToken, "venue-entrance-desk");
      setCheckinStatus({
        success: true,
        message: res.message || "Guest successfully admitted to the venue.",
        admittedDetails: res.passDetails,
      });
      // Re-verify to update pass status on screen
      const updated = await api.verifyPassToken(activeToken);
      setVerificationResult(updated);
    } catch (err: any) {
      const errMsg = err.message || "Check-in failed. Please verify pass credentials.";
      setCheckinStatus({
        success: false,
        message: errMsg,
      });
    } finally {
      setCheckinLoading(false);
    }
  };

  const pass = verificationResult?.passDetails;
  const isAuthorizedScanner = role === "provider" || role === "organiser" || currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] py-10 px-4 sm:px-6 flex flex-col items-center">
      {/* Top Breadcrumb & Brand */}
      <div className="w-full max-w-xl mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-[#8E897F] hover:text-[#191817] flex items-center gap-1 transition-colors"
        >
          &larr; Back to STAGE
        </Link>
        <span className="font-editorial text-sm font-semibold tracking-wide text-[#C85A32]">
          STAGE PASS VERIFICATION
        </span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl bg-white border border-[#E8E5DC] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#191817]">
            Digital Pass Verification
          </h1>
          <p className="text-xs text-[#6B665E] mt-1">
            Validate cryptographically signed entry tokens, verify booking authenticity, and process single-use admissions.
          </p>
        </div>

        {/* Camera Scanner Section */}
        <div className="p-4 bg-[#F4F2EC]/60 border border-[#E8E5DC] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#191817] flex items-center gap-1.5">
              <QrCodeIcon size={16} className="text-[#C85A32]" />
              <span>Camera QR Code Scanner</span>
            </div>
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 rounded-full bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors"
              >
                Start Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 text-xs font-medium transition-colors"
              >
                Stop Camera
              </button>
            )}
          </div>

          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-[#C85A32]">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 border-2 border-dashed border-white/60 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-1 rounded">
                  Align Pass QR Code inside frame
                </span>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircleIcon size={14} className="shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Manual Code / Token Entry Form */}
        <form onSubmit={handleManualLookup} className="space-y-2">
          <label className="block text-xs font-semibold text-[#191817]">
            Enter Pass Token or Booking Reference
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. stg_tok_... or STG-8821-KOL"
              className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#E8E5DC] text-xs font-mono outline-none focus:border-[#C85A32] transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#191817] text-white hover:bg-[#C85A32] text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Pass"}
            </button>
          </div>
        </form>

        {/* Verification Result Display */}
        {verificationResult && (
          <div className="space-y-4 pt-2">
            {/* Status Header Banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              verificationResult.status === "valid"
                ? "bg-[#2D6638]/10 border-[#2D6638]/30 text-[#2D6638]"
                : verificationResult.status === "used"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}>
              <div className="flex items-center gap-2">
                {verificationResult.status === "valid" ? (
                  <CheckIcon size={20} className="text-[#2D6638]" />
                ) : (
                  <AlertCircleIcon size={20} className={verificationResult.status === "used" ? "text-amber-700" : "text-red-700"} />
                )}
                <div>
                  <div className="text-sm font-bold uppercase tracking-wide">
                    {verificationResult.status === "valid"
                      ? "PASS VERIFIED · ADMISSION READY"
                      : verificationResult.status === "used"
                      ? "PASS ALREADY USED"
                      : `VERIFICATION FAILED: ${verificationResult.status.toUpperCase()}`}
                  </div>
                  <div className="text-xs opacity-90">
                    {verificationResult.message}
                  </div>
                </div>
              </div>

              <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border uppercase ${
                verificationResult.status === "valid"
                  ? "bg-[#2D6638] text-white border-[#2D6638]"
                  : verificationResult.status === "used"
                  ? "bg-amber-600 text-white border-amber-700"
                  : "bg-red-600 text-white border-red-700"
              }`}>
                {verificationResult.status}
              </span>
            </div>

            {/* Sanitized Pass Details Card */}
            {pass && (
              <div className="p-5 bg-[#FAFAF7] border border-[#E8E5DC] rounded-2xl space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8E897F]">Performance Event</span>
                  <div className="font-editorial text-lg font-bold text-[#191817]">{pass.eventTitle}</div>
                  <div className="text-[11px] text-[#6B665E]">Art Form: {pass.artForm}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#E8E5DC]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#8E897F]">Schedule</span>
                    <div className="font-medium text-[#191817] mt-0.5">{pass.date}</div>
                    <div className="text-[#6B665E]">{pass.time}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#8E897F]">Venue & City</span>
                    <div className="font-medium text-[#191817] mt-0.5">{pass.venueName}</div>
                    <div className="text-[#6B665E]">{pass.city}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#E8E5DC]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#8E897F]">Attendee Reference</span>
                    <div className="font-medium text-[#191817] mt-0.5">{pass.attendeeName}</div>
                    <div className="text-[#6B665E]">{pass.ticketCount} General Admission</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#8E897F]">Booking Code</span>
                    <div className="font-mono font-semibold text-[#C85A32] mt-0.5">{pass.bookingCode}</div>
                    <div className="text-[10px] text-[#8E897F]">Issued: {pass.issuedAt?.slice(0, 10)}</div>
                  </div>
                </div>

                {pass.usedAt && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                    <strong>Check-in Record:</strong> Admitted at {pass.usedAt}
                  </div>
                )}

                <div className="text-[10px] text-[#8E897F] pt-1 border-t border-[#E8E5DC]">
                  {pass.accessInstructions}
                </div>
              </div>
            )}

            {/* Check-In Action Section */}
            {pass && verificationResult.status === "valid" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={checkinLoading}
                  className="w-full py-3 rounded-full bg-[#2D6638] text-white hover:bg-[#23532D] font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <CheckIcon size={16} />
                  <span>{checkinLoading ? "Processing Admission..." : "Check In Guest (Admit to Venue)"}</span>
                </button>
                <p className="text-[10px] text-[#8E897F] text-center mt-1.5">
                  Concurrency-safe atomic transaction. Pass will immediately transition to 'used'.
                </p>
              </div>
            )}

            {/* Check-In Feedback Banner */}
            {checkinStatus && (
              <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
                checkinStatus.success
                  ? "bg-[#2D6638]/10 border-[#2D6638] text-[#2D6638]"
                  : "bg-red-50 border-red-300 text-red-800"
              }`}>
                {checkinStatus.success ? (
                  <CheckIcon size={16} className="shrink-0" />
                ) : (
                  <AlertCircleIcon size={16} className="shrink-0" />
                )}
                <div className="flex-1 font-medium">
                  {checkinStatus.message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPassPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs">Loading verification portal...</div>}>
      <VerifyPassContent />
    </Suspense>
  );
}

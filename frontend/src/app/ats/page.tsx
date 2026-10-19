"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { AnalysisState, AnalysisResponse } from "@/types";
import { UploadZone } from "@/components/sections/UploadZone";
import { AnalysisPanel } from "@/components/sections/AnalysisPanel";
import { LoadingState } from "@/components/ui/LoadingState";
import { Navbar } from "@/components/ui/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { AlertCircle, RotateCcw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function AtsCheckerContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");

  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loadedFilename, setLoadedFilename] = useState<string>("resume");
  const [jdText, setJdText] = useState("");

  // Load past scan if scanId query param is provided
  useEffect(() => {
    if (!scanId) return;

    let isMounted = true;
    setState({ status: "analyzing" });

    const fetchScan = async () => {
      try {
        const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
        const res = await fetch(`${baseUrl}/api/scans/${scanId}`);
        if (!res.ok) throw new Error("Could not find saved scan.");
        const json = await res.json();
        if (isMounted) {
          setLoadedFilename(json.filename || "Saved Resume");
          setJdText(json.jdText || "");
          setState({
            status: "done",
            data: {
              parseResult: json.parseResult,
              rules: json.rules || [],
              keywordReport: json.keywordReport || null,
              scoreBreakdown: json.scoreBreakdown,
              engineVersion: json.engineVersion || "2.0.0",
              meta: json.meta || {
                parseTimeMs: 0,
                totalTimeMs: 0,
                filename: json.filename || "Saved Resume",
                fileSize: 0,
              },
            },
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load saved scan.",
          });
        }
      }
    };

    fetchScan();
    return () => {
      isMounted = false;
    };
  }, [scanId]);

  const handleAnalyze = useCallback(
    async (file: File, jd: string) => {
      setResumeFile(file);
      setLoadedFilename(file.name);
      setState({ status: "uploading", progress: 0 });

      const formData = new FormData();
      formData.append("resume", file);
      if (jd.trim()) {
        formData.append("jd", jd.trim());
      }
      if (user?.id) {
        formData.append("clerkId", user.id);
      }
      if (user?.primaryEmailAddress?.emailAddress) {
        formData.append("userEmail", user.primaryEmailAddress.emailAddress);
      }

      const headers: Record<string, string> = {};
      if (user?.id) {
        headers["x-clerk-user-id"] = user.id;
      }
      if (user?.primaryEmailAddress?.emailAddress) {
        headers["x-clerk-user-email"] = user.primaryEmailAddress.emailAddress;
      }

      try {
        setState({ status: "uploading", progress: 30 });

        const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
        const response = await fetch(`${baseUrl}/api/analyze`, {
          method: "POST",
          headers,
          body: formData,
        });

        setState({ status: "uploading", progress: 80 });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Server error: ${response.status}`);
        }

        setState({ status: "analyzing" });
        const data: AnalysisResponse = await response.json();
        setState({ status: "done", data });
      } catch (err: unknown) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        });
      }
    },
    [user]
  );

  const handleReset = useCallback(() => {
    setState({ status: "idle" });
    setResumeFile(null);
    setLoadedFilename("resume");
    setJdText("");
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#051A24] font-sans relative clean-theme selection:bg-orange-100 selection:text-orange-950">
      {/* ─── Ambient Glow Backdrop ─── */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-orange-100/40 via-slate-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-10">
        <Navbar onReset={state.status !== "idle" ? handleReset : undefined} />

        {state.status === "idle" && (
          <>
            <HeroSection />
            <UploadZone onAnalyze={handleAnalyze} jdText={jdText} onJdChange={setJdText} />
          </>
        )}

        {(state.status === "uploading" || state.status === "analyzing") && (
          <LoadingState
            status={state.status}
            progress={state.status === "uploading" ? state.progress : undefined}
          />
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 py-12 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.06)] max-w-md w-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto mb-6 shadow-xs">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-[#051A24] mb-3">
                Analysis Failed
              </h2>
              <p className="text-sm text-[#273C46]/80 leading-relaxed mb-8">
                {state.message}
              </p>
              <button
                onClick={handleReset}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#051A24] text-white hover:bg-[#0D212C] font-semibold text-sm transition-all shadow-md cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {state.status === "done" && (
          <AnalysisPanel
            data={state.data}
            filename={resumeFile?.name || loadedFilename}
            resumeFile={resumeFile}
            jdText={jdText}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

export default function AtsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
      <AtsCheckerContent />
    </Suspense>
  );
}

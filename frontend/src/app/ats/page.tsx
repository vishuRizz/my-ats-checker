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
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Background gradient orbs */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar onReset={state.status !== "idle" ? handleReset : undefined} />

        {state.status === "idle" && (
          <>
            <HeroSection />
            <UploadZone onAnalyze={handleAnalyze} jdText={jdText} onJdChange={setJdText} />
          </>
        )}

        {(state.status === "uploading" || state.status === "analyzing") && (
          <LoadingState status={state.status} progress={state.status === "uploading" ? state.progress : undefined} />
        )}

        {state.status === "error" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "70vh",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                marginBottom: 24,
              }}
            >
              ⚠️
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Analysis Failed
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: 480, lineHeight: 1.7, marginBottom: 32 }}>
              {state.message}
            </p>
            <button className="btn-primary" onClick={handleReset}>
              Try Again
            </button>
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
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AtsCheckerContent />
    </Suspense>
  );
}

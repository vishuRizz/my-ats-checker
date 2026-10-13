"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, UserButton, SignInButton, Show } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface SavedScan {
  id: string;
  filename: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  overallScore: number;
  hasJD: boolean;
  matchRate: number | null;
  requiredMatchRate: number | null;
}

interface SavedJob {
  id: string;
  company: string;
  jobTitle: string;
  jobUrl: string | null;
  platform: string;
  status: "wishlist" | "applied" | "interview" | "offer" | "rejected";
  matchScore: number | null;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExtensionStatus {
  installed: boolean;
  synced: boolean;
  activeResume: {
    id?: string;
    filename?: string;
    overallScore?: number;
  } | null;
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"scans" | "jobs">("scans");

  // Scans state
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);

  // Saved Jobs state
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Extension 0-Click Bridge status
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    installed: false,
    synced: false,
    activeResume: null,
  });

  // Listen for Chrome Extension Auth Bridge
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ATS_EXTENSION_PONG") {
        setExtensionStatus({
          installed: true,
          synced: Boolean(event.data.synced),
          activeResume: event.data.activeResume || null,
        });
      }
    };

    window.addEventListener("message", handleMessage);

    // Ping extension in case it is already running
    window.postMessage({ type: "ATS_PING_EXTENSION" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Broadcast Clerk user to Chrome Extension Bridge whenever user is ready
  useEffect(() => {
    if (user?.id) {
      window.postMessage(
        {
          type: "ATS_WEB_AUTH_DATA",
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        },
        "*"
      );
    }
  }, [user?.id, user?.primaryEmailAddress?.emailAddress]);

  // Load Scans & Saved Jobs
  useEffect(() => {
    if (!user?.id) {
      if (isLoaded) {
        setLoadingScans(false);
        setLoadingJobs(false);
      }
      return;
    }

    const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;

    // Fetch scan history
    const fetchScans = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/scans?clerkId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setScans(data.scans || []);
        }
      } catch (err) {
        console.error("Failed to load user scan history:", err);
      } finally {
        setLoadingScans(false);
      }
    };

    // Fetch saved jobs from Chrome extension sidecar
    const fetchJobs = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/saved-jobs?clerkId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setSavedJobs(data.jobs || []);
        }
      } catch (err) {
        console.error("Failed to load saved jobs:", err);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchScans();
    fetchJobs();
  }, [user?.id, isLoaded]);

  // Delete Scan
  const handleDeleteScan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scan from your history?")) return;
    setDeletingScanId(id);
    try {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${baseUrl}/api/scans/${id}`, { method: "DELETE" });
      if (res.ok) {
        setScans((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete scan:", err);
    } finally {
      setDeletingScanId(null);
    }
  };

  // Update Job Status
  const handleUpdateJobStatus = async (
    jobId: string,
    newStatus: "wishlist" | "applied" | "interview" | "offer" | "rejected"
  ) => {
    setUpdatingJobId(jobId);
    try {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${baseUrl}/api/user/saved-jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSavedJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: newStatus,
                  appliedAt: newStatus === "applied" ? new Date().toISOString() : job.appliedAt,
                }
              : job
          )
        );
      }
    } catch (err) {
      console.error("Failed to update job status:", err);
    } finally {
      setUpdatingJobId(null);
    }
  };

  // Delete Saved Job
  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to remove this job from your tracker?")) return;
    setDeletingJobId(jobId);
    try {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${baseUrl}/api/user/saved-jobs/${jobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (err) {
      console.error("Failed to delete saved job:", err);
    } finally {
      setDeletingJobId(null);
    }
  };

  const getScoreColor = (val: number) =>
    val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#ef4444";

  // Filtered jobs
  const filteredJobs = savedJobs.filter((job) => {
    if (jobFilter === "all") return true;
    return job.status === jobFilter;
  });

  // Aggregate stats
  const bestScanScore = scans.length > 0 ? Math.max(...scans.map((s) => s.overallScore)) : 0;
  const avgScanScore =
    scans.length > 0
      ? Math.round(scans.reduce((sum, s) => sum + s.overallScore, 0) / scans.length)
      : 0;

  const inFlightCount = savedJobs.filter(
    (j) => j.status === "applied" || j.status === "interview"
  ).length;
  const offerCount = savedJobs.filter((j) => j.status === "offer").length;
  const jobsWithScore = savedJobs.filter((j) => j.matchScore !== null);
  const avgJobMatchScore =
    jobsWithScore.length > 0
      ? Math.round(jobsWithScore.reduce((sum, j) => sum + (j.matchScore || 0), 0) / jobsWithScore.length)
      : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
      {/* Hidden 0-Click Extension Bridge Element */}
      {user?.id && (
        <div
          id="ats-web-auth-bridge"
          data-clerk-id={user.id}
          data-email={user.primaryEmailAddress?.emailAddress || ""}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* Background glow */}
      <div
        aria-hidden="true"
        className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-zinc-950"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-950/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Header bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-zinc-950 font-bold text-sm">✓</span>
            </div>
            <span className="font-semibold text-white">ATS Checker</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/ats"
              className="text-xs font-semibold px-4 py-1.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm"
            >
              + New Scan
            </Link>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <Show when="signed-out">
          <div className="max-w-md mx-auto text-center py-20 p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-6 text-2xl">
              👤
            </div>
            <h1 className="text-2xl font-bold mb-3 text-white">Sign In to View Your History</h1>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Log in to track your past resume scans, view score progression, and access jobs saved
              from the ATS Checker Chrome Extension.
            </p>
            <SignInButton mode="modal">
              <button className="w-full py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-colors">
                Sign In with Email
              </button>
            </SignInButton>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="flex flex-col gap-8">
            {/* ─── Profile Header ────────────────────────────────────── */}
            <div className="p-8 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-950 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || "User"}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-3xl">
                      👤
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white">
                      {user?.fullName || "Candidate"}
                    </h1>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Public Beta
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "recently"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/ats"
                  className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span>🚀</span>
                  <span>Scan Resume</span>
                </Link>
              </div>
            </div>

            {/* ─── Chrome Extension Companion Card ───────────────────── */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${
                    extensionStatus.installed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                  }`}
                >
                  🧩
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm">
                      {extensionStatus.installed
                        ? "Chrome Extension Connected (0-Click Paired)"
                        : "ATS Checker Chrome Extension"}
                    </h3>
                    {extensionStatus.installed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Synced
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {extensionStatus.installed
                      ? extensionStatus.activeResume
                        ? `Active resume for live JD scoring: ${extensionStatus.activeResume.filename || "Synced"} (${extensionStatus.activeResume.overallScore || 0}% ATS score)`
                        : "Extension sidecar ready on LinkedIn, Indeed, Greenhouse, Lever, Ashby & Workday."
                      : "1-Click ATS match sidecar, in-page X-Ray keywords, and application tracker directly on LinkedIn & job boards."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (user?.id) {
                      window.postMessage(
                        {
                          type: "ATS_WEB_AUTH_DATA",
                          clerkId: user.id,
                          email: user.primaryEmailAddress?.emailAddress,
                        },
                        "*"
                      );
                    }
                    window.postMessage({ type: "ATS_PING_EXTENSION" }, "*");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors border border-zinc-700"
                >
                  🔄 Refresh Sync
                </button>
              </div>
            </div>

            {/* ─── Navigation Tabs ───────────────────────────────────── */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <button
                onClick={() => setActiveTab("scans")}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                  activeTab === "scans"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <span>📄</span>
                <span>Resume Scans</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === "scans" ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {scans.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("jobs")}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                  activeTab === "jobs"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <span>📌</span>
                <span>Tracked Job Applications</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === "jobs" ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {savedJobs.length}
                </span>
              </button>
            </div>

            {/* ─── Tab Content: Resumes ───────────────────────────────── */}
            {activeTab === "scans" && (
              <div className="flex flex-col gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Total Resumes Scanned
                    </div>
                    <div className="text-3xl font-extrabold text-white">
                      {loadingScans ? "..." : scans.length}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">Saved permanently in database</div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Best ATS Score
                    </div>
                    <div
                      className="text-3xl font-extrabold"
                      style={{ color: getScoreColor(bestScanScore) }}
                    >
                      {loadingScans ? "..." : scans.length > 0 ? `${bestScanScore}/100` : "—"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                      {bestScanScore >= 80 ? "Passes top ATS thresholds" : "Room for optimization"}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Average Score
                    </div>
                    <div
                      className="text-3xl font-extrabold"
                      style={{ color: getScoreColor(avgScanScore) }}
                    >
                      {loadingScans ? "..." : scans.length > 0 ? `${avgScanScore}/100` : "—"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">Across all scanned versions</div>
                  </div>
                </div>

                {/* Scans List */}
                <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">Saved Scan History</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Click any scan to open its full report, skill gap matrix, and AI rewrites.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      {scans.length} {scans.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {loadingScans ? (
                    <div className="p-16 text-center text-zinc-500 text-sm">
                      Loading your scan history from database...
                    </div>
                  ) : scans.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="text-4xl mb-3">📄</div>
                      <h3 className="text-base font-bold text-white mb-1">No Scans Saved Yet</h3>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6">
                        Upload your resume to check its ATS parse integrity, score breakdown, and
                        JD keyword match. Scans will be saved here automatically.
                      </p>
                      <Link
                        href="/ats"
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors"
                      >
                        Scan Your First Resume
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60">
                      {scans.map((scan) => {
                        const scoreColor = getScoreColor(scan.overallScore);
                        const dateFormatted = new Date(scan.uploadedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={scan.id}
                            className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm border font-mono"
                                style={{
                                  color: scoreColor,
                                  borderColor: `${scoreColor}30`,
                                  backgroundColor: `${scoreColor}10`,
                                }}
                              >
                                {scan.overallScore}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-semibold text-white text-sm">
                                    {scan.filename}
                                  </h3>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {scan.fileType.toUpperCase()}
                                  </span>
                                  {scan.hasJD && scan.matchRate !== null && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {scan.matchRate}% JD Match
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500">{dateFormatted}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-auto">
                              <Link
                                href={`/ats?scanId=${scan.id}`}
                                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-zinc-700"
                              >
                                <span>👁️</span>
                                <span>View Report</span>
                              </Link>

                              <button
                                onClick={() => handleDeleteScan(scan.id)}
                                disabled={deletingScanId === scan.id}
                                className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors"
                                title="Delete scan"
                              >
                                {deletingScanId === scan.id ? "..." : "🗑️"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Tab Content: Tracked Job Applications ─────────────── */}
            {activeTab === "jobs" && (
              <div className="flex flex-col gap-6">
                {/* Job Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Total Tracked Jobs
                    </div>
                    <div className="text-3xl font-extrabold text-white">
                      {loadingJobs ? "..." : savedJobs.length}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">Saved via 1-click sidecar</div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      In Flight (Applied / Interview)
                    </div>
                    <div className="text-3xl font-extrabold text-indigo-400">
                      {loadingJobs ? "..." : inFlightCount}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">Active pipeline applications</div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Offers Received
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-400">
                      {loadingJobs ? "..." : offerCount}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">Successful outcomes</div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Avg Match Score
                    </div>
                    <div
                      className="text-3xl font-extrabold"
                      style={{ color: getScoreColor(avgJobMatchScore) }}
                    >
                      {loadingJobs ? "..." : jobsWithScore.length > 0 ? `${avgJobMatchScore}%` : "—"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">ATS alignment across jobs</div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(
                    [
                      { id: "all", label: "All Jobs" },
                      { id: "wishlist", label: "Wishlist" },
                      { id: "applied", label: "Applied" },
                      { id: "interview", label: "Interviewing" },
                      { id: "offer", label: "Offers" },
                      { id: "rejected", label: "Rejected" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setJobFilter(f.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        jobFilter === f.id
                          ? "bg-zinc-200 text-zinc-950 font-bold"
                          : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Jobs List */}
                <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">Application Pipeline</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Manage your job opportunities saved from LinkedIn, Indeed, Greenhouse, and Ashby.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}
                    </span>
                  </div>

                  {loadingJobs ? (
                    <div className="p-16 text-center text-zinc-500 text-sm">
                      Loading your tracked job applications...
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="text-4xl mb-3">📌</div>
                      <h3 className="text-base font-bold text-white mb-1">
                        {jobFilter === "all" ? "No Jobs Saved Yet" : `No Jobs in ${jobFilter}`}
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6">
                        Use the ATS Checker Chrome Extension sidecar while browsing LinkedIn,
                        Indeed, Greenhouse, or Ashby to save jobs directly to this dashboard.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60">
                      {filteredJobs.map((job) => {
                        const scoreColor = job.matchScore ? getScoreColor(job.matchScore) : "#94a3b8";
                        const dateFormatted = new Date(job.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });

                        return (
                          <div
                            key={job.id}
                            className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              {/* Match score badge */}
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm border font-mono"
                                style={{
                                  color: scoreColor,
                                  borderColor: `${scoreColor}30`,
                                  backgroundColor: `${scoreColor}10`,
                                }}
                              >
                                {job.matchScore ? `${job.matchScore}%` : "—"}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-semibold text-white text-sm">
                                    {job.jobTitle}
                                  </h3>
                                  <span className="text-xs text-zinc-400 font-medium">
                                    at {job.company}
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
                                    {job.platform}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                  <span>Saved {dateFormatted}</span>
                                  {job.appliedAt && (
                                    <span>
                                      • Applied{" "}
                                      {new Date(job.appliedAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                  {job.jobUrl && (
                                    <a
                                      href={job.jobUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-400 hover:text-indigo-300 underline"
                                    >
                                      Open Posting ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-auto">
                              {/* Inline Status Dropdown */}
                              <select
                                value={job.status}
                                disabled={updatingJobId === job.id}
                                onChange={(e) =>
                                  handleUpdateJobStatus(
                                    job.id,
                                    e.target.value as "wishlist" | "applied" | "interview" | "offer" | "rejected"
                                  )
                                }
                                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                              >
                                <option value="wishlist">📌 Wishlist</option>
                                <option value="applied">📨 Applied</option>
                                <option value="interview">🗣️ Interviewing</option>
                                <option value="offer">🎉 Offer</option>
                                <option value="rejected">❌ Rejected</option>
                              </select>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                disabled={deletingJobId === job.id}
                                className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors"
                                title="Delete job"
                              >
                                {deletingJobId === job.id ? "..." : "🗑️"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Show>
      </main>
    </div>
  );
}

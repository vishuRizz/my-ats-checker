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

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      if (isLoaded) setLoading(false);
      return;
    }

    const fetchScans = async () => {
      try {
        const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
        const res = await fetch(`${baseUrl}/api/user/scans?clerkId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setScans(data.scans || []);
        }
      } catch (err) {
        console.error("Failed to load user scan history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [user?.id, isLoaded]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scan from your history?")) return;
    setDeletingId(id);
    try {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${baseUrl}/api/scans/${id}`, { method: "DELETE" });
      if (res.ok) {
        setScans((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete scan:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const getScoreColor = (val: number) =>
    val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#ef4444";

  const bestScore = scans.length > 0 ? Math.max(...scans.map((s) => s.overallScore)) : 0;
  const avgScore =
    scans.length > 0
      ? Math.round(scans.reduce((sum, s) => sum + s.overallScore, 0) / scans.length)
      : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
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
              Log in to track your past resume scans, view score progression, and access saved ATS
              breakdowns and application kits.
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

            {/* ─── Stats Grid ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Total Resumes Scanned
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {loading ? "..." : scans.length}
                </div>
                <div className="text-xs text-zinc-500 mt-2">Saved permanently in database</div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Best ATS Score
                </div>
                <div
                  className="text-3xl font-extrabold"
                  style={{ color: getScoreColor(bestScore) }}
                >
                  {loading ? "..." : scans.length > 0 ? `${bestScore}/100` : "—"}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  {bestScore >= 80 ? "Passes top ATS thresholds" : "Room for optimization"}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Average Score
                </div>
                <div
                  className="text-3xl font-extrabold"
                  style={{ color: getScoreColor(avgScore) }}
                >
                  {loading ? "..." : scans.length > 0 ? `${avgScore}/100` : "—"}
                </div>
                <div className="text-xs text-zinc-500 mt-2">Across all scanned versions</div>
              </div>
            </div>

            {/* ─── Scan History Section ──────────────────────────────── */}
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

              {loading ? (
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
                            onClick={() => handleDelete(scan.id)}
                            disabled={deletingId === scan.id}
                            className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors"
                            title="Delete scan"
                          >
                            {deletingId === scan.id ? "..." : "🗑️"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}

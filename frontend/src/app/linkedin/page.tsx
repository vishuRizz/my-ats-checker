"use client";

import { useState } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { LinkedInReportPanel } from "@/components/sections/LinkedInReportPanel";
import type { LinkedInAuditResult } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type InputMode = "url" | "pdf" | "text";

export default function LinkedInScannerPage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [profileText, setProfileText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<LinkedInAuditResult | null>(null);

  const handleScan = async (demoId?: string) => {
    setError(null);
    setLoading(true);
    setLoadingStep("Connecting to LinkedIn profile parser...");

    try {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;

      setTimeout(() => setLoadingStep("Evaluating headline keywords & mobile truncation..."), 600);
      setTimeout(() => setLoadingStep("Auditing About section metrics & storytelling narrative..."), 1200);
      setTimeout(() => setLoadingStep("Simulating LinkedIn Recruiter search ranking & InMail conversion..."), 1800);

      let res: Response;

      if (mode === "pdf" && selectedFile && !demoId) {
        const formData = new FormData();
        formData.append("resume", selectedFile);
        if (targetRole) formData.append("targetRole", targetRole);
        res = await fetch(`${baseUrl}/api/linkedin/scan`, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(`${baseUrl}/api/linkedin/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: demoId ? undefined : url,
            targetRole: targetRole || undefined,
            profileText: demoId ? undefined : profileText,
            demoId: demoId || undefined,
          }),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to audit profile. Please check the URL or try again.");
      }

      const data: LinkedInAuditResult = await res.json();
      setAuditResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during analysis.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar onReset={auditResult ? () => setAuditResult(null) : undefined} />

      <main className="flex-1 py-10 px-4">
        {auditResult ? (
          <LinkedInReportPanel data={auditResult} onNewScan={() => setAuditResult(null)} />
        ) : (
          <div style={{ maxWidth: 840, margin: "0 auto", animation: "fadeIn 0.3s ease-out" }}>
            {/* ─── Hero Header ─────────────────────────────────────── */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 99,
                  background: "rgba(10, 102, 194, 0.15)",
                  border: "1px solid rgba(10, 102, 194, 0.35)",
                  color: "#38bdf8",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: 16,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>⚡</span>
                <span>LinkedIn Recruiter Search Simulator</span>
              </div>

              <h1
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  margin: "0 0 12px 0",
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 60%, #94a3b8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Free LinkedIn Profile ATS Scanner
              </h1>

              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "1.05rem",
                  margin: "0 auto",
                  maxWidth: 620,
                  lineHeight: 1.5,
                }}
              >
                Audit your LinkedIn profile against the real algorithms recruiters use in LinkedIn Recruiter.
                Get instant headline hooks, an AI About section rewrite, and simulated InMail response odds.
              </p>
            </div>

            {/* ─── Main Scanner Card ───────────────────────────────── */}
            <div
              style={{
                background: "var(--bg-card, #1e293b)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "32px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Input Mode Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 14,
                  marginBottom: 24,
                }}
              >
                {[
                  { id: "url", label: "🔗 Paste LinkedIn URL" },
                  { id: "pdf", label: "📄 Upload LinkedIn PDF" },
                  { id: "text", label: "📝 Paste Profile Text" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setMode(t.id as InputMode);
                      setError(null);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: mode === t.id ? "rgba(10, 102, 194, 0.2)" : "transparent",
                      color: mode === t.id ? "#38bdf8" : "var(--text-muted)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      border: mode === t.id ? "1px solid rgba(10, 102, 194, 0.4)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Mode 1: URL Input */}
              {mode === "url" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                      Your Public LinkedIn URL:
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/in/your-username"
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        borderRadius: 12,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--border)",
                        color: "white",
                        fontSize: "0.95rem",
                        fontFamily: "var(--font-mono)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                      Target Role (Optional — Tailors Skill Gaps & Headlines):
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Software Engineer, Lead Product Manager, DevOps Architect"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--border)",
                        color: "white",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Mode 2: PDF Upload */}
              {mode === "pdf" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: "rgba(10, 102, 194, 0.1)",
                      border: "1px solid rgba(10, 102, 194, 0.25)",
                      fontSize: "0.82rem",
                      color: "#93c5fd",
                      lineHeight: 1.5,
                    }}
                  >
                    💡 <strong>How to get your LinkedIn PDF:</strong> Go to your LinkedIn profile → click the <strong>&quot;More&quot;</strong> button under your headline → select <strong>&quot;Save to PDF&quot;</strong>.
                  </div>

                  <label
                    style={{
                      padding: "36px 20px",
                      borderRadius: 14,
                      border: "2px dashed var(--border)",
                      background: "rgba(0, 0, 0, 0.2)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      textAlign: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: "2rem" }}>📄</span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      {selectedFile ? selectedFile.name : "Click to select or drop your LinkedIn PDF here"}
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB · Ready to scan` : "Accepts official LinkedIn profile PDF exports"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                      }}
                    />
                  </label>

                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                      Target Role (Optional):
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--border)",
                        color: "white",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Mode 3: Text Paste */}
              {mode === "text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                      Paste Your Headline, About & Experience Text:
                    </label>
                    <textarea
                      rows={6}
                      value={profileText}
                      onChange={(e) => setProfileText(e.target.value)}
                      placeholder="Paste your LinkedIn headline, summary, and experience bullet points here..."
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        borderRadius: 12,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--border)",
                        color: "white",
                        fontSize: "0.9rem",
                        lineHeight: 1.5,
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                      Target Role (Optional):
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--border)",
                        color: "white",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    fontSize: "0.85rem",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* Action Button */}
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={() => handleScan()}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: 12,
                    background: loading ? "rgba(10, 102, 194, 0.5)" : "linear-gradient(135deg, #0a66c2 0%, #004182 100%)",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "1rem",
                    border: "none",
                    cursor: loading ? "wait" : "pointer",
                    boxShadow: "0 8px 24px rgba(10, 102, 194, 0.35)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
                      {loadingStep || "Analyzing LinkedIn Profile..."}
                    </span>
                  ) : (
                    "🚀 Audit My LinkedIn Profile Now"
                  )}
                </button>
              </div>

              {/* 1-Click Demo Profiles */}
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  Or Test Instantly with a Demo Profile:
                </span>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { id: "swe", label: "Alex Morgan · Senior Full Stack SWE", role: "Software Engineer" },
                    { id: "pm", label: "Priya Sharma · Staff Product Manager", role: "Product Manager" },
                    { id: "devops", label: "Jordan Lee · Cloud & DevOps SRE", role: "DevOps Engineer" },
                  ].map((demo) => (
                    <button
                      key={demo.id}
                      onClick={() => handleScan(demo.id)}
                      disabled={loading}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(10, 102, 194, 0.15)")}
                      onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.04)")}
                    >
                      ⚡ {demo.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

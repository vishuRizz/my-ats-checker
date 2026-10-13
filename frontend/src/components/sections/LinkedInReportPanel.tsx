"use client";

import { useState } from "react";
import type { LinkedInAuditResult } from "@/types";
import Link from "next/link";

interface LinkedInReportPanelProps {
  data: LinkedInAuditResult;
  onNewScan: () => void;
}

type TabKey = "headline" | "about" | "experience" | "skills" | "seo" | "recruiter";

export function LinkedInReportPanel({ data, onNewScan }: LinkedInReportPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("headline");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const getScoreColor = (val: number) =>
    val >= 80 ? "var(--green, #10b981)" : val >= 65 ? "var(--amber, #f59e0b)" : "var(--red, #ef4444)";

  const getScoreBg = (val: number) =>
    val >= 80 ? "rgba(16, 185, 129, 0.12)" : val >= 65 ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)";

  const getScoreBorder = (val: number) =>
    val >= 80 ? "rgba(16, 185, 129, 0.3)" : val >= 65 ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)";

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 20px 80px", animation: "fadeIn 0.4s ease-out" }}>
      {/* ─── Hero Profile Overview ──────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "32px",
          marginBottom: 24,
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
          {/* Candidate Profile Details */}
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flex: "1 1 500px" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0a66c2 0%, #004182 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "1.8rem",
                fontWeight: 800,
                border: "3px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 8px 24px rgba(10, 102, 194, 0.4)",
                flexShrink: 0,
              }}
            >
              {data.profile.name.charAt(0)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {data.profile.name}
                </h1>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "3px 10px",
                    borderRadius: 99,
                    background: "rgba(10, 102, 194, 0.2)",
                    color: "#38bdf8",
                    border: "1px solid rgba(10, 102, 194, 0.4)",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  in/{data.profile.vanityHandle}
                </span>
                {data.profile.isCustomVanityUrl && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Custom URL
                  </span>
                )}
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: "0 0 10px 0", lineHeight: 1.45 }}>
                {data.profile.headline}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <span>📍 {data.profile.location}</span>
                <span>🏢 {data.profile.currentCompany}</span>
                <span>🎯 Target: <strong style={{ color: "var(--text-primary)" }}>{data.profile.targetRole}</strong></span>
              </div>
            </div>
          </div>

          {/* Overall Score Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "16px 24px",
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${getScoreBorder(data.overallScore)}`,
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "3rem",
                  fontWeight: 900,
                  color: getScoreColor(data.overallScore),
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
              >
                {data.overallScore}
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                Score / 100
              </span>
            </div>

            <div style={{ width: 1, height: 48, background: "var(--border)" }} />

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    padding: "2px 10px",
                    borderRadius: 8,
                    background: getScoreBg(data.overallScore),
                    color: getScoreColor(data.overallScore),
                    border: `1px solid ${getScoreBorder(data.overallScore)}`,
                  }}
                >
                  Grade {data.grade}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                InMail Likelihood: <strong style={{ color: getScoreColor(data.overallScore) }}>{data.recruiterView.inmailProbability}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Banner */}
        <div
          style={{
            marginTop: 22,
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            💡 <strong>Visibility Verdict:</strong> {data.verdict}
          </div>
          <button
            onClick={onNewScan}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Audit Another Profile
          </button>
        </div>
      </div>

      {/* ─── Viral Share Bar ───────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(10, 102, 194, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)",
          border: "1px solid rgba(10, 102, 194, 0.3)",
          borderRadius: 16,
          padding: "18px 24px",
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>🚀</span>
            <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Share Your Profile Score on LinkedIn & Twitter
            </strong>
            <span style={{ fontSize: "0.7rem", padding: "2px 7px", borderRadius: 99, background: "rgba(16, 185, 129, 0.2)", color: "#34d399", fontWeight: 700 }}>
              VIRAL BADGE
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            &quot;Scored {data.overallScore}/100 on ATS Checker for LinkedIn Recruiter visibility.&quot;
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => copyToClipboard(data.viralShare.shareText, "share-summary")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid var(--border)",
              color: "white",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {copiedKey === "share-summary" ? "✓ Copied Text!" : "📋 Copy Share Text"}
          </button>

          <a
            href={data.viralShare.linkedinShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "#0a66c2",
              color: "white",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>in</span> Share on LinkedIn
          </a>

          <a
            href={data.viralShare.twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            𝕏 Share on X
          </a>
        </div>
      </div>

      {/* ─── Metric Pills Overview ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          { key: "headline", label: "Headline Hook", score: data.metrics.headlineScore, icon: "🏷️" },
          { key: "about", label: "About Narrative", score: data.metrics.aboutScore, icon: "📖" },
          { key: "experience", label: "Experience & XYZ", score: data.metrics.experienceScore, icon: "💼" },
          { key: "skills", label: "Skills & Keywords", score: data.metrics.skillsScore, icon: "🎯" },
          { key: "seo", label: "SEO & Visibility", score: data.metrics.seoVisibilityScore, icon: "🌐" },
          { key: "recruiter", label: "Recruiter Card", score: data.overallScore, icon: "🔍" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key as TabKey)}
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: activeTab === item.key ? "var(--bg-card, #1e293b)" : "rgba(255, 255, 255, 0.02)",
              border: activeTab === item.key ? "2px solid #0a66c2" : "1px solid var(--border)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {item.icon} {item.label}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: 99,
                  background: getScoreBg(item.score),
                  color: getScoreColor(item.score),
                }}
              >
                {item.score}%
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${item.score}%`,
                  height: "100%",
                  background: getScoreColor(item.score),
                  transition: "width 0.4s ease-out",
                }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* ─── Detailed Audit Section ────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-card, #1e293b)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "28px",
        }}
      >
        {/* ─── TAB 1: HEADLINE MASTERY ────────────────────────────── */}
        {activeTab === "headline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  🏷️ Headline Optimization & Recruiter Search Hooks
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Your headline is the #1 weighted factor in LinkedIn Recruiter search algorithms.
                </p>
              </div>
              <div style={{ padding: "6px 14px", borderRadius: 8, background: getScoreBg(data.headlineAudit.score), border: `1px solid ${getScoreBorder(data.headlineAudit.score)}` }}>
                <span style={{ fontWeight: 800, color: getScoreColor(data.headlineAudit.score) }}>
                  Score: {data.headlineAudit.score} / 100
                </span>
              </div>
            </div>

            {/* Current vs Ideal Length */}
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                <span>Character Count: <strong>{data.headlineAudit.charCount} characters</strong></span>
                <span style={{ color: "var(--text-muted)" }}>Target: 120 – 220 characters</span>
              </div>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, (data.headlineAudit.charCount / 220) * 100)}%`,
                    height: "100%",
                    background: data.headlineAudit.charCount >= 120 && data.headlineAudit.charCount <= 220 ? "var(--green)" : "var(--amber)",
                  }}
                />
              </div>
            </div>

            {/* Strengths & Issues */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* Strengths */}
              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--green)", display: "block", marginBottom: 10 }}>
                  ✓ Working Well
                </span>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.headlineAudit.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Issues */}
              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--amber)", display: "block", marginBottom: 10 }}>
                  ⚠ Optimization Opportunities
                </span>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.headlineAudit.issues.length > 0 ? (
                    data.headlineAudit.issues.map((iss, idx) => <li key={idx}>{iss}</li>)
                  ) : (
                    <li>No major headline issues detected! Clean keyword coverage.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* AI Generated Headline Variants */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: "1.1rem" }}>✨</span>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  AI-Generated High-Converting Headlines (Tailored for {data.profile.targetRole})
                </h4>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.headlineAudit.aiSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 14,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "rgba(10, 102, 194, 0.15)",
                          color: "#38bdf8",
                          display: "inline-block",
                          marginBottom: 6,
                        }}
                      >
                        {item.formula}
                      </span>
                      <p style={{ margin: "0 0 6px 0", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                        &quot;{item.text}&quot;
                      </p>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        💡 {item.rationale}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(item.text, `headline-${idx}`)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        background: copiedKey === `headline-${idx}` ? "var(--green)" : "var(--accent, #6366f1)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        border: "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {copiedKey === `headline-${idx}` ? "✓ Copied!" : "📋 Copy Headline"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ABOUT SECTION STORYTELLING ──────────────────── */}
        {activeTab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  📖 About / Summary Section Narrative
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  A persuasive 1st-person summary converts curious recruiter clicks into interview inbounds.
                </p>
              </div>
              <div style={{ padding: "6px 14px", borderRadius: 8, background: getScoreBg(data.aboutAudit.score), border: `1px solid ${getScoreBorder(data.aboutAudit.score)}` }}>
                <span style={{ fontWeight: 800, color: getScoreColor(data.aboutAudit.score) }}>
                  Score: {data.aboutAudit.score} / 100
                </span>
              </div>
            </div>

            {/* Checklist Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div style={{ padding: "14px", borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Word Count</span>
                <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{data.aboutAudit.wordCount} words</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: 2 }}>Target: 150 – 300</span>
              </div>

              <div style={{ padding: "14px", borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Voice Persona</span>
                <strong style={{ fontSize: "1.1rem", color: data.aboutAudit.hasFirstPersonVoice ? "var(--green)" : "var(--amber)" }}>
                  {data.aboutAudit.hasFirstPersonVoice ? "1st Person (I / My)" : "3rd Person"}
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: 2 }}>Modern LinkedIn standard</span>
              </div>

              <div style={{ padding: "14px", borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Quantified Metrics</span>
                <strong style={{ fontSize: "1.1rem", color: data.aboutAudit.hasMetrics ? "var(--green)" : "var(--amber)" }}>
                  {data.aboutAudit.hasMetrics ? "Included" : "Missing Metrics"}
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: 2 }}>Proof of real scale</span>
              </div>

              <div style={{ padding: "14px", borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Contact Call to Action</span>
                <strong style={{ fontSize: "1.1rem", color: data.aboutAudit.hasCallToAction ? "var(--green)" : "var(--amber)" }}>
                  {data.aboutAudit.hasCallToAction ? "Clear CTA" : "Missing CTA"}
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: 2 }}>Direct outreach invitation</span>
              </div>
            </div>

            {/* AI Rewrite Showcase */}
            <div
              style={{
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border)",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1.1rem" }}>✍️</span>
                  <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    AI-Optimized About Section Rewrite (Ready to Paste)
                  </strong>
                </div>
                <button
                  onClick={() => copyToClipboard(data.aboutAudit.aiRewrite.fullText, "about-full")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: copiedKey === "about-full" ? "var(--green)" : "var(--accent, #6366f1)",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {copiedKey === "about-full" ? "✓ Copied About!" : "📋 Copy Full About"}
                </button>
              </div>

              <pre
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  padding: "16px 20px",
                  borderRadius: 10,
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  margin: 0,
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {data.aboutAudit.aiRewrite.fullText}
              </pre>
            </div>
          </div>
        )}

        {/* ─── TAB 3: EXPERIENCE & XYZ IMPACT ──────────────────────── */}
        {activeTab === "experience" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  💼 Experience Bullets & Quantification (XYZ Formula)
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Evaluating bullet point structure: Google XYZ formula (&quot;Accomplished [X] measured by [Y] by doing [Z]&quot;).
                </p>
              </div>
              <div style={{ padding: "6px 14px", borderRadius: 8, background: getScoreBg(data.experienceAudit.score), border: `1px solid ${getScoreBorder(data.experienceAudit.score)}` }}>
                <span style={{ fontWeight: 800, color: getScoreColor(data.experienceAudit.score) }}>
                  Score: {data.experienceAudit.score} / 100
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Quantified Bullets Ratio</span>
                <strong style={{ fontSize: "1.8rem", color: data.experienceAudit.quantifiedBulletsRatio >= 0.5 ? "var(--green)" : "var(--amber)" }}>
                  {Math.round(data.experienceAudit.quantifiedBulletsRatio * 100)}%
                </strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Target: &gt;50% with numbers</span>
              </div>

              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Decisive Action Verbs</span>
                <strong style={{ fontSize: "1.8rem", color: "var(--text-primary)" }}>
                  {data.experienceAudit.actionVerbCount} verbs
                </strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Avoid passive phrases like &quot;worked on&quot;</span>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.experienceAudit.strengths.map((str, idx) => (
                <div key={idx} style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.85rem", color: "#34d399" }}>
                  ✓ {str}
                </div>
              ))}
              {data.experienceAudit.issues.map((iss, idx) => (
                <div key={idx} style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", fontSize: "0.85rem", color: "#fbbf24" }}>
                  ⚠ {iss}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: SKILLS & ENDORSEMENTS ────────────────────────── */}
        {activeTab === "skills" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  🎯 Skills Taxonomy & Top 3 Pinned Strategy
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  LinkedIn Recruiter algorithm prioritizes candidates with verified skill tags and target role competencies.
                </p>
              </div>
              <div style={{ padding: "6px 14px", borderRadius: 8, background: getScoreBg(data.skillsAudit.score), border: `1px solid ${getScoreBorder(data.skillsAudit.score)}` }}>
                <span style={{ fontWeight: 800, color: getScoreColor(data.skillsAudit.score) }}>
                  Score: {data.skillsAudit.score} / 100
                </span>
              </div>
            </div>

            {/* Top 3 Pinned Recommendation */}
            <div style={{ padding: "18px 22px", borderRadius: 12, background: "rgba(10, 102, 194, 0.08)", border: "1px solid rgba(10, 102, 194, 0.3)" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                ⭐ Recommended Top 3 Pinned Skills (Profile Preview)
              </span>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
                Recruiters see only your top 3 pinned skills without expanding the section. Pin these core hard skills:
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {data.skillsAudit.topPinnedRecommended.map((skill, idx) => (
                  <span
                    key={skill}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      background: "rgba(10, 102, 194, 0.2)",
                      border: "1px solid rgba(10, 102, 194, 0.4)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                    }}
                  >
                    #{idx + 1} {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing High Demand Skills */}
            {data.skillsAudit.missingHighDemandSkills.length > 0 && (
              <div style={{ padding: "18px 22px", borderRadius: 12, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  ⚠ Missing High-Demand Skills for {data.profile.targetRole}
                </span>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
                  Adding these keywords to your skills section and experience bullets will boost recruiter search impressions:
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {data.skillsAudit.missingHighDemandSkills.map((m) => (
                    <span
                      key={m}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        color: "#fbbf24",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      + {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* All Detected Skills */}
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Detected Profile Competencies ({data.skillsAudit.detectedSkills.length})
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.skillsAudit.detectedSkills.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: SEO & EASY APPLY SAFETY ──────────────────────── */}
        {activeTab === "seo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  🌐 Profile SEO, Vanity URL & Easy Apply Compatibility
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Ensuring your profile is indexed smoothly by Google, LinkedIn search bots, and Easy Apply parsers.
                </p>
              </div>
              <div style={{ padding: "6px 14px", borderRadius: 8, background: getScoreBg(data.visibilityAudit.score), border: `1px solid ${getScoreBorder(data.visibilityAudit.score)}` }}>
                <span style={{ fontWeight: 800, color: getScoreColor(data.visibilityAudit.score) }}>
                  Score: {data.visibilityAudit.score} / 100
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.visibilityAudit.checklist.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px 20px",
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${item.passed ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.3)"}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: item.passed ? "var(--green)" : "var(--amber)", fontWeight: 700 }}>
                        {item.passed ? "✓" : "⚠"}
                      </span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>{item.item}</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      {item.tip}
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 99,
                      background: item.passed ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: item.passed ? "#34d399" : "#fbbf24",
                    }}
                  >
                    {item.passed ? "Optimized" : "Action Needed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: LINKEDIN RECRUITER SEARCH SIMULATOR ─────────── */}
        {activeTab === "recruiter" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                🔍 LinkedIn Recruiter Search Result Simulation
              </h3>
              <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Preview how technical recruiters and hiring managers see your profile in candidate search lists.
              </p>
            </div>

            {/* Simulated LinkedIn Recruiter Card */}
            <div
              style={{
                borderRadius: 16,
                background: "#0f172a",
                border: "2px solid rgba(10, 102, 194, 0.5)",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(10, 102, 194, 0.2)",
                    color: "#38bdf8",
                    border: "1px solid rgba(10, 102, 194, 0.4)",
                  }}
                >
                  Recruiter View · Top Match Result
                </span>

                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                  }}
                >
                  ✓ #OpenToWork Flag Detected
                </span>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#0a66c2",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    border: "2px solid #10b981",
                    flexShrink: 0,
                  }}
                >
                  {data.profile.name.charAt(0)}
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", margin: "0 0 4px 0" }}>
                    {data.profile.name} <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 400 }}>· 1st / 2nd</span>
                  </h4>
                  <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                    {data.profile.headline}
                  </p>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 12 }}>
                    {data.profile.location} · Current: <span style={{ color: "white", fontWeight: 600 }}>{data.profile.currentCompany}</span>
                  </div>

                  {/* Matched Skill Badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Matched Query Skills:</span>
                    {data.recruiterView.simulatedCard.matchedSkills.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          fontWeight: 600,
                        }}
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recruiter Conversion Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Search Tier Standing</span>
                <strong style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>{data.recruiterView.searchTierStanding}</strong>
              </div>

              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Estimated InMail Response Likelihood</span>
                <strong style={{ fontSize: "1.2rem", color: getScoreColor(data.overallScore) }}>{data.recruiterView.inmailProbability}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Convert to ATS Resume Bridge ──────────────────────────── */}
      <div
        style={{
          marginTop: 28,
          padding: "24px 28px",
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)", display: "block" }}>
            Ready to test your full Resume against Workday & Greenhouse?
          </strong>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Run your standard resume document through all 12 ATS formatting rules and semantic job description matching.
          </span>
        </div>

        <Link href="/ats">
          <button
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              background: "white",
              color: "#09090b",
              fontWeight: 700,
              fontSize: "0.88rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(255,255,255,0.2)",
            }}
          >
            Launch Full ATS Resume Checker →
          </button>
        </Link>
      </div>
    </div>
  );
}

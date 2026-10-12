"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApplicationKitPanelProps {
  data: AnalysisResponse;
  jdText?: string;
}

type KitType = "cover_letter" | "linkedin_summary";
type Tone = "professional" | "confident" | "concise";

interface KitResult {
  content: string;
  type: KitType;
  keyMatchesHighlighted: string[];
  wordCount: number;
}

export function ApplicationKitPanel({ data, jdText }: ApplicationKitPanelProps) {
  const [activeType, setActiveType] = useState<KitType>("cover_letter");
  const [tone, setTone] = useState<Tone>("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<KitType, KitResult | null>>({
    cover_letter: null,
    linkedin_summary: null,
  });
  const [copied, setCopied] = useState(false);

  const candidateName = data.parseResult.entities?.name?.value || "Candidate";
  const hasJD = Boolean(jdText && jdText.trim().length >= 20);

  const generateKit = async (typeToGenerate = activeType, selectedTone = tone) => {
    if (!jdText || jdText.trim().length < 20) {
      setError("Please provide a Job Description to generate a tailored application kit.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${baseUrl}/api/generate-kit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parseResult: data.parseResult,
          jdText: jdText.trim(),
          type: typeToGenerate,
          tone: selectedTone,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server returned error (${res.status})`);
      }

      const resultData: KitResult = await res.json();
      setResults((prev) => ({ ...prev, [typeToGenerate]: resultData }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate kit.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentResult = results[activeType];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── Header & JD Notice ─────────────────────────────────────── */}
      <div
        style={{
          padding: "24px 28px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          border: "1px solid rgba(129,140,248,0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: "1.4rem" }}>🎯</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
              Tailored Application Kit
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: 99,
                background: "rgba(129,140,248,0.2)",
                color: "#c7d2fe",
                fontWeight: 600,
              }}
            >
              AI-Powered · Groq Llama 3.3
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1", maxWidth: 600 }}>
            Generate high-converting job application collateral matched strictly to your genuine
            experience and target role requirements. Zero hallucinated claims.
          </p>
        </div>

        {/* Format Selector Pills */}
        <div style={{ display: "flex", gap: 8, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setActiveType("cover_letter")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              background: activeType === "cover_letter" ? "#6366f1" : "transparent",
              color: activeType === "cover_letter" ? "#ffffff" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            ✉️ Cover Letter
          </button>
          <button
            onClick={() => setActiveType("linkedin_summary")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              background: activeType === "linkedin_summary" ? "#6366f1" : "transparent",
              color: activeType === "linkedin_summary" ? "#ffffff" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            💼 LinkedIn About
          </button>
        </div>
      </div>

      {!hasJD && (
        <div
          style={{
            padding: "18px 24px",
            borderRadius: 12,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: "#f59e0b", fontSize: "0.92rem" }}>
              Job Description Not Provided
            </strong>
            <p style={{ margin: "2px 0 0", color: "#a1a1aa", fontSize: "0.84rem" }}>
              To tailor your cover letter and LinkedIn summary to specific requirements and keywords,
              paste a Job Description when running your scan.
            </p>
          </div>
        </div>
      )}

      {/* ─── Controls: Tone & Trigger ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          padding: "16px 20px",
          background: "var(--bg-card)",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            Tone of Voice:
          </span>
          {(["professional", "confident", "concise"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                background: tone === t ? "rgba(255,255,255,0.12)" : "transparent",
                color: tone === t ? "#ffffff" : "var(--text-muted)",
                border: `1px solid ${tone === t ? "rgba(255,255,255,0.3)" : "var(--border)"}`,
              }}
            >
              {t === "professional" ? "👔 Polished & Professional" : t === "confident" ? "🚀 Bold & Results-Driven" : "⚡ Concise & Direct"}
            </button>
          ))}
        </div>

        <button
          onClick={() => generateKit(activeType, tone)}
          disabled={loading || !hasJD}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            background: hasJD ? "#ffffff" : "#3f3f46",
            color: hasJD ? "#09090b" : "#71717a",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: hasJD ? "pointer" : "not-allowed",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: hasJD ? "0 4px 14px rgba(255,255,255,0.1)" : "none",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Generating..." : currentResult ? "✨ Regenerate" : "✨ Generate Collateral"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef4444",
            fontSize: "0.85rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ─── Loading State ───────────────────────────────────────────── */}
      {loading && (
        <div
          style={{
            padding: "70px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.15)",
              borderTopColor: "#6366f1",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
            Analyzing candidate achievements and mapping to job description requirements...
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: 0 }}>
            Powered by Groq Llama 3.3 · Takes 4–8 seconds
          </p>
        </div>
      )}

      {/* ─── Content Output Display ──────────────────────────────────── */}
      {!loading && currentResult && (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          {/* Card Action Bar */}
          <div
            style={{
              padding: "14px 20px",
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {activeType === "cover_letter" ? "Tailored Cover Letter" : "LinkedIn Executive About"}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  background: "var(--bg-card)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                }}
              >
                {currentResult.wordCount} words
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => copyToClipboard(currentResult.content)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: copied ? "rgba(16,185,129,0.15)" : "var(--bg-card)",
                  color: copied ? "#10b981" : "var(--text-primary)",
                  border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                  transition: "all 0.15s",
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
              </button>
              <button
                onClick={() =>
                  downloadText(
                    currentResult.content,
                    `${candidateName.replace(/\s+/g, "_")}_${activeType}.txt`
                  )
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                💾 Download .txt
              </button>
            </div>
          </div>

          {/* Key skills highlighted */}
          {currentResult.keyMatchesHighlighted?.length > 0 && (
            <div
              style={{
                padding: "10px 20px",
                background: "rgba(99,102,241,0.05)",
                borderBottom: "1px solid rgba(99,102,241,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#818cf8" }}>
                Skills woven into collateral:
              </span>
              {currentResult.keyMatchesHighlighted.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: "rgba(99,102,241,0.15)",
                    color: "#c7d2fe",
                    fontWeight: 600,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Content Body */}
          <div
            style={{
              padding: "28px 32px",
              fontSize: "0.94rem",
              lineHeight: 1.75,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-sans, inherit)",
            }}
          >
            {currentResult.content}
          </div>
        </div>
      )}

      {/* ─── Empty State ─────────────────────────────────────────────── */}
      {!loading && !currentResult && hasJD && (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            background: "var(--bg-card)",
            borderRadius: 14,
            border: "1px dashed var(--border)",
          }}
        >
          <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>✨</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
            Ready to generate your application kit
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 440, margin: "0 auto 20px" }}>
            Click <strong>Generate Collateral</strong> above to create a tailored{" "}
            {activeType === "cover_letter" ? "Cover Letter" : "LinkedIn Executive About"} perfectly matched to this job.
          </p>
          <button
            onClick={() => generateKit(activeType, tone)}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              background: "#ffffff",
              color: "#09090b",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              border: "none",
            }}
          >
            Generate {activeType === "cover_letter" ? "Cover Letter" : "LinkedIn About"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import type { AnalysisResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ImprovementType =
  | "quantify"
  | "action_verb"
  | "specificity"
  | "keyword_alignment"
  | "conciseness";

export interface BulletSuggestion {
  original: string;
  suggested: string;
  rationale: string;
  groundedIn: string;
  needsUserProof: boolean;
  improvementType: ImprovementType;
  sectionName: string;
}

interface SuggestionsResponse {
  suggestions: BulletSuggestion[];
  source: "llm" | "rule_based" | "none";
  message?: string;
}

interface SuggestionsPanelProps {
  data: AnalysisResponse;
  jdText?: string;
}

const IMPROVEMENT_LABELS: Record<ImprovementType, { label: string; color: string; bg: string }> = {
  quantify:           { label: "Add Metric",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  action_verb:        { label: "Action Verb",       color: "#d4d4d8", bg: "rgba(255,255,255,0.1)" },
  specificity:        { label: "More Specific",     color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  keyword_alignment:  { label: "Keyword Aligned",   color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  conciseness:        { label: "More Concise",      color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
};

export function SuggestionsPanel({ data, jdText }: SuggestionsPanelProps) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "done"; result: SuggestionsResponse }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const [decisions, setDecisions] = useState<Record<number, "accepted" | "rejected" | null>>({});
  const [copied, setCopied] = useState<number | null>(null);

  const runSuggest = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`${API_URL}/api/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parseResult: data.parseResult,
          jdText: jdText ?? "",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }
      const result: SuggestionsResponse = await res.json();
      setState({ status: "done", result });
    } catch (err: any) {
      setState({ status: "error", message: err?.message || "Failed to get suggestions." });
    }
  }, [data.parseResult, jdText]);

  const decide = (idx: number, action: "accepted" | "rejected") => {
    setDecisions((d) => ({ ...d, [idx]: d[idx] === action ? null : action }));
  };

  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  const acceptedCount = Object.values(decisions).filter((v) => v === "accepted").length;

  if (state.status === "idle") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 20, padding: "60px 20px", textAlign: "center",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: "linear-gradient(135deg, #27272a, #18181b)",
          border: "1px solid #3f3f46",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem",
        }}>✨</div>
        <div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            AI Bullet Rewrites
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.65 }}>
            Get AI-powered rewrites for your experience bullets - stronger action verbs, better metrics framing,
            and keyword alignment with the JD.
            {!jdText && " Add a job description for best results."}
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>
            Suggestions are grounded in your resume text only. No fabrication.
          </p>
        </div>
        <button
          onClick={runSuggest}
          id="run-ai-rewrites-button"
          style={{
            padding: "12px 28px",
            background: "#ffffff",
            border: "1px solid #e4e4e7", borderRadius: 10, color: "#09090b",
            fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(255,255,255,0.1)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          ✨ Generate AI Rewrites
        </button>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          5 free AI rewrites per hour · Powered by Groq
        </p>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 16, padding: "80px 20px",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.2)",
          borderTopColor: "#ffffff",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Analysing your bullets with AI…
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          Using Groq · Takes 5–15 seconds
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 16, padding: "60px 20px", textAlign: "center",
      }}>
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 400 }}>{state.message}</p>
        <button onClick={() => setState({ status: "idle" })} className="btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  const { result } = state;

  if (result.source === "none" || result.suggestions.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "2rem", marginBottom: 12 }}>🔍</p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {result.message || "No experience bullets found to rewrite."}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 8 }}>
          Make sure your resume has an Experience or Projects section with bullet points.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 10,
        border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.1rem" }}>✨</span>
          <div>
            <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "0.9rem" }}>
              {result.suggestions.length} bullets analysed
              {acceptedCount > 0 && ` · ${acceptedCount} accepted`}
            </p>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.75rem" }}>
              {result.source === "llm" ? "AI-powered rewrites · Groq" : "Rule-based tips (AI unavailable)"}
            </p>
          </div>
        </div>
        <button onClick={() => setState({ status: "idle" })} className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
          Regenerate
        </button>
      </div>

      {/* Suggestion cards */}
      {result.suggestions.map((s, idx) => {
        const decision = decisions[idx] ?? null;
        const tag = IMPROVEMENT_LABELS[s.improvementType] ?? IMPROVEMENT_LABELS.action_verb;
        const hasChange = s.suggested !== s.original;

        return (
          <div
            key={idx}
            style={{
              borderRadius: 12, border: `1px solid ${decision === "accepted" ? "rgba(16,185,129,0.4)" : decision === "rejected" ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
              background: decision === "accepted" ? "rgba(16,185,129,0.04)" : decision === "rejected" ? "rgba(239,68,68,0.03)" : "var(--bg-card)",
              overflow: "hidden", transition: "border-color 0.2s, background 0.2s",
              opacity: decision === "rejected" ? 0.55 : 1,
            }}
          >
            {/* Card header */}
            <div style={{
              padding: "10px 14px", display: "flex", alignItems: "center",
              justifyContent: "space-between", borderBottom: "1px solid var(--border)",
              background: "var(--bg-elevated)",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em",
                  padding: "2px 8px", borderRadius: 99,
                  background: tag.bg, color: tag.color,
                }}>{tag.label}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                  {s.sectionName}
                </span>
                {s.needsUserProof && (
                  <span style={{
                    fontSize: "0.68rem", padding: "2px 7px", borderRadius: 99,
                    background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontWeight: 600,
                  }}>⚡ Fill in [NUMBER]</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => copy(s.suggested, idx)}
                  title="Copy suggestion"
                  style={{
                    padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)",
                    background: "transparent", cursor: "pointer", fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {copied === idx ? "✓ Copied" : "Copy"}
                </button>
                <button
                  onClick={() => decide(idx, "accepted")}
                  title="Accept"
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: decision === "accepted" ? "#10b981" : "rgba(16,185,129,0.1)",
                    color: decision === "accepted" ? "#fff" : "#10b981",
                    fontSize: "0.75rem", fontWeight: 600, transition: "all 0.15s",
                  }}
                >✓ Accept</button>
                <button
                  onClick={() => decide(idx, "rejected")}
                  title="Reject"
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: decision === "rejected" ? "#ef4444" : "rgba(239,68,68,0.08)",
                    color: decision === "rejected" ? "#fff" : "#ef4444",
                    fontSize: "0.75rem", fontWeight: 600, transition: "all 0.15s",
                  }}
                >✕ Skip</button>
              </div>
            </div>

            {/* Diff body */}
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Original */}
              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: hasChange ? "rgba(239,68,68,0.05)" : "var(--bg-elevated)",
                border: hasChange ? "1px solid rgba(239,68,68,0.15)" : "1px solid var(--border)",
              }}>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Original
                </p>
                <p style={{
                  fontSize: "0.88rem", lineHeight: 1.6, margin: 0,
                  color: hasChange ? "#9ca3af" : "var(--text-primary)",
                  textDecoration: hasChange ? "line-through" : "none",
                  fontStyle: hasChange ? "italic" : "normal",
                }}>
                  {s.original}
                </p>
              </div>

              {/* Suggested */}
              {hasChange && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "rgba(16,185,129,0.05)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}>
                  <p style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ✨ Suggested
                  </p>
                  <p style={{ fontSize: "0.88rem", lineHeight: 1.6, margin: 0, color: "var(--text-primary)", fontWeight: 500 }}>
                    {s.suggested}
                  </p>
                </div>
              )}

              {/* Rationale */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>💡</span>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                  {s.rationale}
                </p>
              </div>

              {/* needsUserProof warning */}
              {s.needsUserProof && (
                <div style={{
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                }}>
                  <p style={{ fontSize: "0.8rem", color: "#f59e0b", margin: 0, lineHeight: 1.55 }}>
                    <strong>⚡ Action required:</strong> Replace <code style={{ background: "rgba(245,158,11,0.15)", padding: "1px 5px", borderRadius: 4 }}>[NUMBER]</code> with a real metric from your experience. Do not publish a placeholder.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Summary footer */}
      {acceptedCount > 0 && (
        <div style={{
          padding: "14px 18px", borderRadius: 10,
          background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ color: "#10b981", fontWeight: 600, margin: 0, fontSize: "0.88rem" }}>
            ✓ {acceptedCount} suggestion{acceptedCount !== 1 ? "s" : ""} accepted
          </p>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.78rem" }}>
            Copy each accepted suggestion and paste into your resume
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { AnalysisResponse, VendorProfileReport, VendorStatus, BooleanQueryResult } from "@/types";

interface AtsSimulatorPanelProps {
  data: AnalysisResponse;
}

const PRESET_QUERIES = [
  { label: "Frontend Lead", query: '("React" OR "Next.js") AND ("TypeScript" OR "JavaScript") AND NOT "Junior"' },
  { label: "Backend Cloud", query: '("Python" OR "Golang" OR "Java") AND ("Kubernetes" OR "Docker") AND "AWS"' },
  { label: "Full Stack", query: '("Node.js" OR "Express") AND ("React" OR "Vue") AND ("PostgreSQL" OR "MongoDB")' },
  { label: "AI / ML Engineer", query: '("Machine Learning" OR "Deep Learning") AND ("PyTorch" OR "TensorFlow")' },
  { label: "DevOps / SRE", query: '("Terraform" OR "Ansible") AND ("CI/CD" OR "GitHub Actions") AND "Linux"' },
  { label: "Product Manager", query: '("Product Roadmap" OR "Agile") AND ("Metrics" OR "KPI")' },
];

export function AtsSimulatorPanel({ data }: AtsSimulatorPanelProps) {
  const { vendorReports = [], parseResult } = data;
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorReports[0]?.vendor || "workday");

  // Boolean Search Simulator State
  const [searchQuery, setSearchQuery] = useState('("React" OR "TypeScript") AND ("Node.js" OR "API")');
  const [queryResult, setQueryResult] = useState<BooleanQueryResult | null>(() => {
    return evaluateClientBoolean('("React" OR "TypeScript") AND ("Node.js" OR "API")', parseResult.bestEffortText || parseResult.readingOrderText || "");
  });

  const selectedVendor = vendorReports.find((v) => v.vendor === selectedVendorId) || vendorReports[0];

  const handleTestQuery = (queryToRun?: string) => {
    const q = queryToRun !== undefined ? queryToRun : searchQuery;
    const text = parseResult.bestEffortText || parseResult.readingOrderText || "";
    const res = evaluateClientBoolean(q, text);
    setQueryResult(res);
  };

  const getStatusBadge = (status: VendorStatus) => {
    switch (status) {
      case "pass":
        return { label: "Compatible", color: "var(--green, #10b981)", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" };
      case "warning":
        return { label: "Quirks Detected", color: "var(--amber, #f59e0b)", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" };
      case "fail":
        return { label: "High Risk", color: "var(--red, #ef4444)", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ─── Hero Header ─────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: "1.2rem" }}>🏢</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Enterprise ATS Simulator
              </h2>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "#818cf8",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Documented Quirks Mode
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0, maxWidth: 680 }}>
              Different applicant tracking systems do not parse resumes equally. Here is how leading enterprise engines
              (Workday, Greenhouse, Lever, Taleo, iCIMS) parse and ingest your document based on known parsing quirks.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {vendorReports.map((v) => {
              const badge = getStatusBadge(v.status);
              return (
                <div
                  key={v.vendor}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${badge.border}`,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: badge.color }} />
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{v.vendorName}:</span>
                  <span style={{ color: badge.color, fontWeight: 700 }}>{v.score}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── ATS Vendor Tabs & Cards ─────────────────────────────── */}
      <div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginBottom: 16 }}>
          {vendorReports.map((v) => {
            const isSelected = v.vendor === selectedVendorId;
            const badge = getStatusBadge(v.status);
            return (
              <button
                key={v.vendor}
                onClick={() => setSelectedVendorId(v.vendor)}
                style={{
                  flex: "1 0 180px",
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: isSelected ? "var(--bg-card, #1e293b)" : "rgba(255, 255, 255, 0.02)",
                  border: isSelected ? "2px solid var(--accent, #6366f1)" : "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected ? "0 4px 20px rgba(99, 102, 241, 0.25)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {v.vendorName}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: badge.color }}>{v.score}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ 100 compatibility</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {v.marketShare}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Vendor Detail View */}
        {selectedVendor && (
          <div
            style={{
              background: "var(--bg-card, #1e293b)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {selectedVendor.vendorName} Ingestion Report
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{selectedVendor.marketShare}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: getStatusBadge(selectedVendor.status).bg,
                  border: `1px solid ${getStatusBadge(selectedVendor.status).border}`,
                }}
              >
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: getStatusBadge(selectedVendor.status).color }}>
                  {selectedVendor.score}%
                </span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: getStatusBadge(selectedVendor.status).color }}>
                  {getStatusBadge(selectedVendor.status).label}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border)",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                marginBottom: 20,
              }}
            >
              💡 <strong>System Verdict:</strong> {selectedVendor.verdict}
            </div>

            {/* Quirks & Rules Checklist */}
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 12 }}>
              Evaluated Ingestion Rules & Document Quirks
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedVendor.quirks.map((q) => {
                const qBadge = getStatusBadge(q.status);
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: "14px 18px",
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${q.status === "pass" ? "var(--border)" : qBadge.border}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {q.id}
                        </span>
                        <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>{q.title}</strong>
                      </div>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: qBadge.bg,
                          color: qBadge.color,
                          border: `1px solid ${qBadge.border}`,
                        }}
                      >
                        {qBadge.label}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {q.reason}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      <span>Impact:</span>
                      <span style={{ color: qBadge.color, fontWeight: 600 }}>{q.impact}</span>
                    </div>

                    {q.fix && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: "8px 12px",
                          borderRadius: 6,
                          background: "rgba(99, 102, 241, 0.08)",
                          border: "1px solid rgba(99, 102, 241, 0.2)",
                          fontSize: "0.8rem",
                          color: "#a5b4fc",
                        }}
                      >
                        🔧 <strong>Recommended Fix:</strong> {q.fix}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Recruiter Boolean Query Simulator ───────────────────── */}
      <div
        style={{
          background: "var(--bg-card, #1e293b)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "28px",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "1.2rem" }}>🔍</span>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Recruiter Boolean Search Simulator
            </h3>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: 99,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontWeight: 600,
              }}
            >
              Exact Search Syntax
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0, maxWidth: 750 }}>
            Talent acquisition recruiters use advanced Boolean strings in ATS search bars to filter candidates.
            Test whether your parsed resume text surfaces in a recruiter query or gets filtered out.
          </p>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Load Example Recruiter Query:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setSearchQuery(preset.query);
                  handleTestQuery(preset.query);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border)",
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(99, 102, 241, 0.15)")}
                onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.04)")}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input Box */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTestQuery();
            }}
            placeholder='e.g. ("React" OR "Vue") AND "TypeScript" AND NOT "Intern"'
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
          <button
            onClick={() => handleTestQuery()}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              background: "var(--accent, #6366f1)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.2s ease",
            }}
          >
            Run Query
          </button>
        </div>

        {/* Query Evaluation Result Card */}
        {queryResult && (
          <div
            style={{
              borderRadius: 12,
              padding: "20px 24px",
              background: queryResult.surfaced
                ? "rgba(16, 185, 129, 0.06)"
                : "rgba(239, 68, 68, 0.06)",
              border: queryResult.surfaced
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 99,
                    background: queryResult.surfaced ? "var(--green, #10b981)" : "var(--red, #ef4444)",
                    color: "white",
                  }}
                >
                  {queryResult.surfaced ? "✓ SURFACED IN SEARCH" : "✕ NOT FOUND / FILTERED OUT"}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {queryResult.surfaced ? "Recruiter candidate list: Match" : "Recruiter candidate list: 0 Results"}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500, margin: "0 0 16px 0", lineHeight: 1.5 }}>
              {queryResult.explanation}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {/* Matched Terms */}
              <div style={{ padding: "12px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--green, #10b981)", display: "block", marginBottom: 6 }}>
                  ✓ Matched Terms ({queryResult.matchedTerms.length})
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {queryResult.matchedTerms.length > 0 ? (
                    queryResult.matchedTerms.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>None</span>
                  )}
                </div>
              </div>

              {/* Missing Terms */}
              <div style={{ padding: "12px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--amber, #f59e0b)", display: "block", marginBottom: 6 }}>
                  ⚠ Missing Required Terms ({queryResult.missingTerms.length})
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {queryResult.missingTerms.length > 0 ? (
                    queryResult.missingTerms.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#fbbf24",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>None (All satisfied)</span>
                  )}
                </div>
              </div>

              {/* Excluded Matches */}
              <div style={{ padding: "12px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--red, #ef4444)", display: "block", marginBottom: 6 }}>
                  ✕ Triggered NOT Filters ({queryResult.excludedMatches.length})
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {queryResult.excludedMatches.length > 0 ? (
                    queryResult.excludedMatches.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                        }}
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>None (Safe)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fast Client-Side Boolean Evaluator ──────────────────────────
function termExists(term: string, text: string): boolean {
  const clean = term.toLowerCase().trim();
  if (!clean) return false;
  if (clean.includes(" ")) {
    return text.includes(` ${clean} `) || text.includes(clean);
  }
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

function evaluateClientBoolean(rawQuery: string, resumeText: string): BooleanQueryResult {
  const normalized = " " + resumeText.toLowerCase().replace(/\s+/g, " ") + " ";
  const query = rawQuery.trim();

  if (!query) {
    return {
      query: "",
      surfaced: true,
      matchedTerms: [],
      missingTerms: [],
      excludedMatches: [],
      explanation: "Empty search query matches all candidates.",
    };
  }

  const matchedTerms: string[] = [];
  const missingTerms: string[] = [];
  const excludedMatches: string[] = [];

  const regex = /"([^"]+)"|(\bNOT\s+"[^"]+"|\bNOT\s+\w+)|(\b[A-Za-z0-9#+.-]+\b)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(query)) !== null) {
    const raw = match[0];
    if (/^(AND|OR|\(|\))$/i.test(raw)) continue;

    if (/^NOT\s+/i.test(raw)) {
      const excludedTerm = raw.replace(/^NOT\s+/i, "").replace(/"/g, "").trim();
      if (termExists(excludedTerm, normalized)) {
        if (!excludedMatches.includes(excludedTerm)) excludedMatches.push(excludedTerm);
      }
    } else {
      const term = (match[1] || match[3] || "").replace(/"/g, "").trim();
      if (!term || /^(AND|OR|NOT)$/i.test(term)) continue;

      if (termExists(term, normalized)) {
        if (!matchedTerms.includes(term)) matchedTerms.push(term);
      } else {
        if (!missingTerms.includes(term)) missingTerms.push(term);
      }
    }
  }

  let surfaced = false;
  try {
    let expr = query;
    expr = expr.replace(/"([^"]+)"/g, (_, term) => (termExists(term, normalized) ? "true" : "false"));
    expr = expr.replace(/\bNOT\s+([A-Za-z0-9#+.-]+)/gi, (_, term) => {
      const exists = term === "true" ? true : term === "false" ? false : termExists(term, normalized);
      return exists ? "false" : "true";
    });
    expr = expr.replace(/\bAND\b/gi, "&&");
    expr = expr.replace(/\bOR\b/gi, "||");
    expr = expr.replace(/\b([A-Za-z0-9#+.-]+)\b/g, (m) => {
      if (m === "true" || m === "false" || m === "&&" || m === "||") return m;
      return termExists(m, normalized) ? "true" : "false";
    });
    const sanitized = expr.replace(/[^truefalse&|!()\s]/g, "");
    surfaced = Boolean(Function(`"use strict"; return (${sanitized});`)());
  } catch {
    surfaced = false;
  }

  let explanation = "";
  if (surfaced) {
    explanation = "Your resume SURFACED! It satisfies all mandatory keywords and avoided all negative filter terms in this recruiter query.";
  } else if (excludedMatches.length > 0) {
    explanation = `Your resume was FILTERED OUT because of negative filter terms: "${excludedMatches.join(', ')}".`;
  } else if (missingTerms.length > 0) {
    explanation = `Your resume was MISSED because it lacks required terms: "${missingTerms.join(', ')}".`;
  } else {
    explanation = "Your resume did not satisfy the logical condition of this boolean search query.";
  }

  return { query, surfaced, matchedTerms, missingTerms, excludedMatches, explanation };
}

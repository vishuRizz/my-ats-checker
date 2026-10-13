"use client";

import { useState, useEffect } from "react";
import type { AnalysisResponse } from "@/types";
import { useUser } from "@clerk/nextjs";

interface VersionCompareModalProps {
  currentData: AnalysisResponse;
  currentFilename: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyNewScan?: (newData: AnalysisResponse, filename: string) => void;
}

interface HistoricalScan {
  id: string;
  filename: string;
  uploadedAt: string;
  overallScore: number;
}

export function VersionCompareModal({
  currentData,
  currentFilename,
  isOpen,
  onClose,
  onApplyNewScan,
}: VersionCompareModalProps) {
  const { user } = useUser();
  const [pastScans, setPastScans] = useState<HistoricalScan[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [baselineData, setBaselineData] = useState<AnalysisResponse | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(false);
  const [uploadingRevision, setUploadingRevision] = useState(false);

  // Fetch user scans for selection
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const fetchScans = async () => {
      try {
        const res = await fetch(`/api/user/scans?clerkId=${encodeURIComponent(user.id)}`);
        if (res.ok) {
          const json = await res.json();
          setPastScans(json.scans || []);
        }
      } catch {
        // Ignore
      }
    };
    fetchScans();
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Load a historical scan as baseline
  const handleSelectBaseline = async (id: string) => {
    setSelectedScanId(id);
    if (!id) {
      setBaselineData(null);
      return;
    }
    setLoadingBaseline(true);
    try {
      const res = await fetch(`/api/scans/${id}`);
      if (res.ok) {
        const full = await res.json();
        setBaselineData(full);
      }
    } catch {
      // Error
    } finally {
      setLoadingBaseline(false);
    }
  };

  // Upload an updated resume file right now to compare
  const handleUploadRevision = async (file: File) => {
    setUploadingRevision(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const result: AnalysisResponse = await res.json();
        // Set current as baseline and the new result as the active comparison
        setBaselineData(currentData);
        if (onApplyNewScan) {
          onApplyNewScan(result, file.name);
        }
      }
    } catch {
      // Error
    } finally {
      setUploadingRevision(false);
    }
  };

  // Calculations for before vs after
  const beforeScore = baselineData?.scoreBreakdown?.overall ?? null;
  const afterScore = currentData.scoreBreakdown.overall;
  const scoreDiff = beforeScore !== null ? afterScore - beforeScore : null;

  // Resolved rules
  const baselineRuleIds = new Set(baselineData?.rules?.map((r) => r.id) || []);
  const currentRuleIds = new Set(currentData.rules.map((r) => r.id));
  const resolvedRules = baselineData?.rules?.filter((r) => !currentRuleIds.has(r.id)) || [];
  const newlyTriggeredRules = currentData.rules.filter((r) => !baselineRuleIds.has(r.id));

  // Matched keywords diff
  const baselineKeywords = new Set(baselineData?.keywordReport?.matched?.map((m) => m.keyword) || []);
  const newlyMatchedKeywords =
    currentData.keywordReport?.matched?.filter((m) => !baselineKeywords.has(m.keyword)) || [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-card, #1e293b)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.3rem" }}>⚖️</span>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Resume Version Comparison & Score Diff
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Compare your current scan with a prior version or upload an updated resume to verify your improvements.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Baseline Selection Controls */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Select from past scans */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 260, flex: 1 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Select Baseline Version:
            </label>
            <select
              value={selectedScanId}
              onChange={(e) => handleSelectBaseline(e.target.value)}
              disabled={loadingBaseline}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              <option value="">-- Choose a past scan to compare --</option>
              {pastScans.map((s) => (
                <option key={s.id} value={s.id} style={{ background: "#0f172a" }}>
                  {s.filename} (Score: {s.overallScore}) — {new Date(s.uploadedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {/* Or upload new file */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Or Re-scan Revised Resume:
            </span>
            <label
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--accent, #6366f1)",
                color: "white",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: uploadingRevision ? "wait" : "pointer",
                textAlign: "center",
                display: "inline-block",
              }}
            >
              {uploadingRevision ? "Analyzing New Resume..." : "📤 Upload Revised PDF/DOCX"}
              <input
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                disabled={uploadingRevision}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadRevision(f);
                }}
              />
            </label>
          </div>
        </div>

        {/* Loading indicator */}
        {loadingBaseline && (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            Loading baseline version details...
          </div>
        )}

        {/* Comparison Dashboard */}
        {baselineData && !loadingBaseline && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* ─── Score Delta Hero ─────────────────────────────────── */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "24px 28px",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              {/* Baseline Score */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Baseline Scan
                </span>
                <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "var(--text-secondary)", marginTop: 4 }}>
                  {beforeScore}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {baselineData.meta?.filename || "Initial Version"}
                </span>
              </div>

              {/* Arrow & Delta */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "1.5rem" }}>➔</span>
                {scoreDiff !== null && (
                  <div
                    style={{
                      padding: "4px 14px",
                      borderRadius: 99,
                      background: scoreDiff >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: scoreDiff >= 0 ? "#34d399" : "#f87171",
                      border: `1px solid ${scoreDiff >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      fontSize: "0.95rem",
                      fontWeight: 800,
                    }}
                  >
                    {scoreDiff >= 0 ? `+${scoreDiff} pts` : `${scoreDiff} pts`}
                  </div>
                )}
              </div>

              {/* Current Score */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Current / Revised
                </span>
                <div
                  style={{
                    fontSize: "2.4rem",
                    fontWeight: 900,
                    color: afterScore >= 80 ? "var(--green)" : afterScore >= 60 ? "var(--amber)" : "var(--red)",
                    marginTop: 4,
                  }}
                >
                  {afterScore}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{currentFilename}</span>
              </div>
            </div>

            {/* ─── Category Breakdown Progression ─────────────────── */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
                Category Score Progression
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                {[
                  {
                    name: "Parse Integrity",
                    before: baselineData.scoreBreakdown.parseIntegrity.score,
                    after: currentData.scoreBreakdown.parseIntegrity.score,
                  },
                  {
                    name: "Formatting Risks",
                    before: baselineData.scoreBreakdown.formattingRisks.score,
                    after: currentData.scoreBreakdown.formattingRisks.score,
                  },
                  {
                    name: "Bullet Quality",
                    before: baselineData.scoreBreakdown.bulletQuality.score,
                    after: currentData.scoreBreakdown.bulletQuality.score,
                  },
                  ...(currentData.scoreBreakdown.keywordCoverage
                    ? [
                        {
                          name: "Keyword Match",
                          before: baselineData.scoreBreakdown.keywordCoverage?.score ?? 0,
                          after: currentData.scoreBreakdown.keywordCoverage.score,
                        },
                      ]
                    : []),
                ].map((cat) => {
                  const diff = cat.after - cat.before;
                  return (
                    <div
                      key={cat.name}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "rgba(0, 0, 0, 0.2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>
                        {cat.name}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {cat.before} ➔ {cat.after}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: diff >= 0 ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {diff >= 0 ? `+${diff}` : `${diff}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Resolved Rules & Newly Matched Keywords ────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {/* Resolved Rules */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ color: "var(--green)" }}>✓</span>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    Resolved Formatting Issues ({resolvedRules.length})
                  </strong>
                </div>
                {resolvedRules.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {resolvedRules.map((rule) => (
                      <div
                        key={rule.id}
                        style={{
                          fontSize: "0.8rem",
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          color: "#34d399",
                        }}
                      >
                        ✓ Fixed {rule.id}: {rule.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    No prior warnings resolved yet.
                  </span>
                )}
              </div>

              {/* Newly Matched Keywords */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ color: "var(--accent, #6366f1)" }}>🎯</span>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    Newly Matched JD Keywords ({newlyMatchedKeywords.length})
                  </strong>
                </div>
                {newlyMatchedKeywords.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {newlyMatchedKeywords.map((kw) => (
                      <span
                        key={kw.keyword}
                        style={{
                          fontSize: "0.75rem",
                          padding: "4px 8px",
                          borderRadius: 6,
                          background: "rgba(99, 102, 241, 0.15)",
                          color: "#a5b4fc",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                        }}
                      >
                        + {kw.keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    No new keyword matches detected in this version.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {!baselineData && !loadingBaseline && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: 14,
              border: "1px dashed var(--border)",
            }}
          >
            <span style={{ fontSize: "2rem", display: "block", marginBottom: 10 }}>📊</span>
            <p style={{ color: "var(--text-primary)", fontWeight: 600, margin: "0 0 6px 0" }}>
              Select a past scan or upload a revision to see the side-by-side progression
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              Verify how your fixes impacted your overall ATS score, rule penalties, and keyword match rates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

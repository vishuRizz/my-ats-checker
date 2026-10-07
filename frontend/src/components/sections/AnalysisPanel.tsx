"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/types";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { RulesPanel } from "./RulesPanel";
import { ParseReport } from "./ParseReport";
import { KeywordReport } from "./KeywordReport";
import { ScorePanel } from "./ScorePanel";

interface AnalysisPanelProps {
  data: AnalysisResponse;
  filename: string;
  resumeFile?: File | null;
  onReset: () => void;
}

type Tab = "parse" | "rules" | "score" | "keywords";

export function AnalysisPanel({ data, filename, resumeFile, onReset }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("parse");

  const { parseResult, rules, keywordReport, scoreBreakdown, meta } = data;
  const criticalCount = rules.filter((r) => r.severity === "critical").length;
  const warningCount = rules.filter((r) => r.severity === "warning").length;

  const tabs: { id: Tab; label: string; badge?: string; badgeColor?: string }[] = [
    { id: "parse", label: "📋 Parse Report" },
    {
      id: "rules",
      label: "⚙️ Formatting Rules",
      badge: `${rules.length}`,
      badgeColor: criticalCount > 0 ? "var(--red)" : warningCount > 0 ? "var(--amber)" : "var(--green)",
    },
    { id: "score", label: "📊 Score Breakdown" },
    ...(keywordReport
      ? [{
        id: "keywords" as Tab,
        label: "🎯 Keyword Match",
        badge: `${keywordReport.matchRate}%`,
        badgeColor: keywordReport.matchRate >= 70 ? "var(--green)" : keywordReport.matchRate >= 40 ? "var(--amber)" : "var(--red)",
      }]
      : []),
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px", animation: "fadeIn 0.4s ease-out" }}>

      {/* ─── Summary Header ─────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 24,
        alignItems: "center",
        padding: "32px 0 24px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 24,
      }}>
        {/* Score Ring */}
        <ScoreRing score={scoreBreakdown.overall} size={100} />

        {/* Info */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {filename}
            </h1>
            <span style={{
              fontSize: "0.75rem", padding: "3px 10px",
              borderRadius: 99, background: "var(--bg-elevated)",
              border: "1px solid var(--border)", color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}>
              {parseResult.fileType.toUpperCase()} · {parseResult.pageCount}p
            </span>
          </div>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16 }}>
            {scoreBreakdown.estimatedLabel} · Analyzed in {(meta.totalTimeMs / 1000).toFixed(1)}s · {parseResult.sections.length} sections detected
          </p>

          {/* Quick stats */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              {
                label: `${criticalCount} Critical`,
                color: criticalCount > 0 ? "var(--red)" : "var(--green)",
                bg: criticalCount > 0 ? "var(--red-dim)" : "var(--green-dim)",
              },
              {
                label: `${warningCount} Warnings`,
                color: warningCount > 0 ? "var(--amber)" : "var(--green)",
                bg: warningCount > 0 ? "var(--amber-dim)" : "var(--green-dim)",
              },
              parseResult.isMultiColumn && { label: "Multi-column", color: "var(--amber)", bg: "var(--amber-dim)" },
              parseResult.isImageOnly && { label: "Image-only PDF", color: "var(--red)", bg: "var(--red-dim)" },
              keywordReport && {
                label: `${keywordReport.matchRate}% keyword match`,
                color: keywordReport.matchRate >= 70 ? "var(--green)" : keywordReport.matchRate >= 40 ? "var(--amber)" : "var(--red)",
                bg: keywordReport.matchRate >= 70 ? "var(--green-dim)" : keywordReport.matchRate >= 40 ? "var(--amber-dim)" : "var(--red-dim)",
              },
            ].filter(Boolean).map((stat: any, i) => (
              <span key={i} style={{
                padding: "4px 12px", borderRadius: 99,
                background: stat.bg, color: stat.color,
                fontSize: "0.8rem", fontWeight: 600,
                border: `1px solid ${stat.color}33`,
              }}>
                {stat.label}
              </span>
            ))}
          </div>
        </div>

        {/* New Scan button (top right) */}
        <button
          className="btn-secondary"
          onClick={onReset}
          style={{ gridColumn: "span 2", justifySelf: "end", alignSelf: "start" }}
          id="new-scan-button"
        >
          ← New Scan
        </button>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 6, overflowX: "auto",
        paddingBottom: 4, marginBottom: 24,
        borderBottom: "1px solid var(--border)",
        scrollbarWidth: "none",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            id={`tab-${tab.id}`}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {tab.label}
            {tab.badge && (
              <span style={{
                fontSize: "0.72rem", padding: "2px 7px",
                borderRadius: 99, fontWeight: 700,
                background: activeTab === tab.id ? "rgba(255,255,255,0.2)" : `${tab.badgeColor}22`,
                color: activeTab === tab.id ? "white" : tab.badgeColor,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────── */}
      <div style={{ animation: "fadeIn 0.3s ease-out" }} key={activeTab}>
        {activeTab === "parse" && <ParseReport parseResult={parseResult} resumeFile={resumeFile} />}
        {activeTab === "rules" && <RulesPanel rules={rules} />}
        {activeTab === "score" && <ScorePanel scoreBreakdown={scoreBreakdown} />}
        {activeTab === "keywords" && keywordReport && <KeywordReport report={keywordReport} />}
      </div>
    </div>
  );
}

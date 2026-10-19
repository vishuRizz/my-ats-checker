"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/types";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ExportButton } from "@/components/ui/ExportButton";
import { RulesPanel } from "./RulesPanel";
import { ParseReport } from "./ParseReport";
import { SkillGapPanel } from "./SkillGapPanel";
import { ScorePanel } from "./ScorePanel";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { ApplicationKitPanel } from "./ApplicationKitPanel";
import { AtsSimulatorPanel } from "./AtsSimulatorPanel";
import { BenchmarkingPanel } from "./BenchmarkingPanel";
import { VersionCompareModal } from "./VersionCompareModal";
import { ArrowLeft, GitCompare } from "lucide-react";

interface AnalysisPanelProps {
  data: AnalysisResponse;
  filename: string;
  resumeFile?: File | null;
  jdText?: string;
  onReset: () => void;
}

type Tab = "score" | "simulator" | "benchmarking" | "keywords" | "suggest" | "kit" | "parse" | "rules";

export function AnalysisPanel({ data, filename, resumeFile, jdText, onReset }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("score");
  const [currentData, setCurrentData] = useState<AnalysisResponse>(data);
  const [currentFilename, setCurrentFilename] = useState<string>(filename);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const { parseResult, rules, keywordReport, scoreBreakdown, meta } = currentData;
  const criticalCount = rules.filter((r) => r.severity === "critical").length;
  const warningCount = rules.filter((r) => r.severity === "warning").length;

  const tabs: { id: Tab; label: string; badge?: string; badgeColor?: string }[] = [
    { id: "score", label: "📊 Score Breakdown" },
    {
      id: "simulator",
      label: "🏢 ATS Simulator",
      badge: "5 Engines",
      badgeColor: "#6366f1",
    },
    {
      id: "benchmarking",
      label: "📈 Benchmarking",
      badge: "Percentile",
      badgeColor: "#10b981",
    },
    ...(keywordReport
      ? [
          {
            id: "keywords" as Tab,
            label: "🎯 Skill Gap & Match",
            badge: `${keywordReport.matchRate}%`,
            badgeColor:
              keywordReport.matchRate >= 70
                ? "#10b981"
                : keywordReport.matchRate >= 40
                ? "#f59e0b"
                : "#ef4444",
          },
          { id: "suggest" as Tab, label: "✨ AI Bullet Rewrites" },
          { id: "kit" as Tab, label: "📝 Application Kit" },
        ]
      : []),
    { id: "parse", label: "📋 Parse Report" },
    {
      id: "rules",
      label: "⚙️ Formatting Rules",
      badge: `${rules.length}`,
      badgeColor: criticalCount > 0 ? "#ef4444" : warningCount > 0 ? "#f59e0b" : "#10b981",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 animate-fade-in">
      {/* ─── Summary Header Card ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          {/* Left: Score ring + Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="shrink-0 flex items-center justify-center">
              <ScoreRing score={scoreBreakdown.overall} size={105} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[#051A24] tracking-tight">
                  {filename}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono font-semibold">
                  {parseResult.fileType.toUpperCase()} · {parseResult.pageCount}p
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#273C46]/80 mb-4">
                <strong className="text-[#051A24]">{scoreBreakdown.estimatedLabel}</strong> · Analyzed in{" "}
                {(meta.totalTimeMs / 1000).toFixed(1)}s · {parseResult.sections.length} sections recognized
              </p>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: `${criticalCount} Critical Flags`,
                    color: criticalCount > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
                  },
                  {
                    label: `${warningCount} Warnings`,
                    color: warningCount > 0 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
                  },
                  parseResult.isMultiColumn && {
                    label: "Multi-column layout",
                    color: "text-amber-700 bg-amber-50 border-amber-200",
                  },
                  parseResult.isImageOnly && {
                    label: "Image-only PDF (Unparseable)",
                    color: "text-red-700 bg-red-50 border-red-200",
                  },
                  keywordReport && {
                    label: `${keywordReport.matchRate}% Job Match`,
                    color:
                      keywordReport.matchRate >= 70
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : keywordReport.matchRate >= 40
                        ? "text-amber-700 bg-amber-50 border-amber-200"
                        : "text-red-700 bg-red-50 border-red-200",
                  },
                ]
                  .filter(Boolean)
                  .map((badge: any, i) => (
                    <span
                      key={i}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-full border shadow-2xs ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-4 lg:pt-0">
            <button
              onClick={() => setIsCompareOpen(true)}
              id="compare-versions-button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-xs sm:text-sm font-medium text-slate-700 hover:text-black shadow-xs transition-colors cursor-pointer"
            >
              <GitCompare size={14} className="text-[#F26522]" />
              <span>Compare Versions</span>
            </button>

            <ExportButton data={currentData} filename={currentFilename} />

            <button
              onClick={onReset}
              id="new-scan-button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#051A24] hover:bg-[#0D212C] text-xs sm:text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>New Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Pill Tabs Bar ───────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar border-b border-slate-200/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              id={`tab-${tab.id}`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer shadow-xs ${
                isActive
                  ? "bg-[#051A24] text-white shadow-sm font-semibold"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                  style={!isActive && tab.badgeColor ? { color: tab.badgeColor } : undefined}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content Panels ──────────────────────────────────── */}
      <div className="animate-fade-in" key={activeTab}>
        {activeTab === "score" && <ScorePanel scoreBreakdown={scoreBreakdown} />}
        {activeTab === "simulator" && <AtsSimulatorPanel data={currentData} />}
        {activeTab === "benchmarking" && <BenchmarkingPanel data={currentData} />}
        {activeTab === "keywords" && keywordReport && <SkillGapPanel report={keywordReport} />}
        {activeTab === "suggest" && <SuggestionsPanel data={currentData} jdText={jdText} />}
        {activeTab === "kit" && <ApplicationKitPanel data={currentData} jdText={jdText} />}
        {activeTab === "parse" && <ParseReport parseResult={parseResult} resumeFile={resumeFile} />}
        {activeTab === "rules" && <RulesPanel rules={rules} />}
      </div>

      {/* ─── Version Comparison Modal ────────────────────────────── */}
      <VersionCompareModal
        currentData={currentData}
        currentFilename={currentFilename}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onApplyNewScan={(newData, newFilename) => {
          setCurrentData(newData);
          setCurrentFilename(newFilename);
          setIsCompareOpen(false);
        }}
      />
    </div>
  );
}

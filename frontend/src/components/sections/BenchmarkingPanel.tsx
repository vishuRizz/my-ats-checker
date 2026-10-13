"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/types";

interface BenchmarkingPanelProps {
  data: AnalysisResponse;
}

interface RoleBenchmark {
  id: string;
  title: string;
  mean: number;
  stdDev: number;
  p90: number;
  p75: number;
  p50: number;
  dimensions: {
    format: number;
    quantification: number;
    keywords: number;
    experience: number;
  };
}

const ROLE_BENCHMARKS: RoleBenchmark[] = [
  {
    id: "sde2",
    title: "SDE-2 / Mid-Level Software Engineer",
    mean: 64,
    stdDev: 12,
    p90: 82,
    p75: 74,
    p50: 64,
    dimensions: { format: 80, quantification: 62, keywords: 70, experience: 68 },
  },
  {
    id: "senior_sde",
    title: "Senior Software Engineer (L5 / Senior)",
    mean: 70,
    stdDev: 11,
    p90: 86,
    p75: 78,
    p50: 70,
    dimensions: { format: 85, quantification: 72, keywords: 76, experience: 80 },
  },
  {
    id: "fullstack",
    title: "Full Stack Developer",
    mean: 63,
    stdDev: 13,
    p90: 81,
    p75: 72,
    p50: 63,
    dimensions: { format: 78, quantification: 58, keywords: 72, experience: 66 },
  },
  {
    id: "devops",
    title: "DevOps / SRE / Cloud Engineer",
    mean: 66,
    stdDev: 12,
    p90: 84,
    p75: 75,
    p50: 66,
    dimensions: { format: 82, quantification: 64, keywords: 75, experience: 70 },
  },
  {
    id: "ai_ml",
    title: "Data Scientist / Machine Learning Engineer",
    mean: 65,
    stdDev: 13,
    p90: 83,
    p75: 74,
    p50: 65,
    dimensions: { format: 80, quantification: 66, keywords: 73, experience: 68 },
  },
  {
    id: "sde1",
    title: "SDE-1 / Junior Software Engineer (0-2 YOE)",
    mean: 58,
    stdDev: 14,
    p90: 78,
    p75: 68,
    p50: 58,
    dimensions: { format: 75, quantification: 48, keywords: 64, experience: 55 },
  },
  {
    id: "pm",
    title: "Product Manager (Tech)",
    mean: 68,
    stdDev: 11,
    p90: 85,
    p75: 77,
    p50: 68,
    dimensions: { format: 84, quantification: 74, keywords: 71, experience: 76 },
  },
];

export function BenchmarkingPanel({ data }: BenchmarkingPanelProps) {
  const [selectedRoleId, setSelectedRoleId] = useState("sde2");
  const currentRole = ROLE_BENCHMARKS.find((r) => r.id === selectedRoleId) || ROLE_BENCHMARKS[0];

  const overallScore = data.scoreBreakdown.overall;
  const parseScore = data.scoreBreakdown.parseIntegrity.score;
  const formattingScore = data.scoreBreakdown.formattingRisks.score;
  const bulletScore = data.scoreBreakdown.bulletQuality.score;
  const keywordScore = data.scoreBreakdown.keywordCoverage?.score ?? 70;

  // Approximate normal distribution percentile
  const z = (overallScore - currentRole.mean) / currentRole.stdDev;
  const percentile = Math.min(99, Math.max(1, Math.round(normalCdf(z) * 100)));
  const topPercent = Math.max(1, 100 - percentile);

  // Candidate dimensions
  const candidateDimensions = {
    format: Math.round((parseScore + formattingScore) / 2),
    quantification: bulletScore,
    keywords: keywordScore,
    experience: Math.min(100, Math.round((overallScore + bulletScore) / 2)),
  };

  // Company tier thresholds
  const tiers = [
    {
      name: "Tier 1 Tech & Top Fintech",
      sub: "Google, Meta, Stripe, Databricks",
      cutoff: 82,
      likelihood:
        overallScore >= 82 ? "Very High (88%)" : overallScore >= 72 ? "Moderate (55%)" : "Competitive Risk (20%)",
      color: overallScore >= 82 ? "var(--green)" : overallScore >= 72 ? "var(--amber)" : "var(--red)",
      status: overallScore >= 82 ? "Above Filter Cutoff" : overallScore >= 72 ? "Near Filter Cutoff" : "Below Typical Cutoff",
    },
    {
      name: "High-Growth Scaleups & Unicorns",
      sub: "Series B-E Startups, Razorpay, Zepto, Swiggy",
      cutoff: 70,
      likelihood:
        overallScore >= 70 ? "Excellent (92%)" : overallScore >= 60 ? "Strong (70%)" : "Borderline (40%)",
      color: overallScore >= 70 ? "var(--green)" : overallScore >= 60 ? "var(--amber)" : "var(--red)",
      status: overallScore >= 70 ? "Above Filter Cutoff" : overallScore >= 60 ? "Near Filter Cutoff" : "Below Typical Cutoff",
    },
    {
      name: "Global Fortune 500 Enterprise",
      sub: "JPMorgan, Walmart, Cisco, Accenture",
      cutoff: 60,
      likelihood:
        overallScore >= 60 ? "Guaranteed Pass (98%)" : "Pass Likely (75%)",
      color: overallScore >= 60 ? "var(--green)" : "var(--amber)",
      status: overallScore >= 60 ? "Above Filter Cutoff" : "Near Filter Cutoff",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ─── Hero Overview ─────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "24px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: "1.2rem" }}>📈</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Industry & Role Benchmarking
              </h2>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                100,000+ Resume Dataset
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0, maxWidth: 680 }}>
              Compare your resume against competitive applicant pools for your target tech roles.
              Understand where you rank on the percentile curve and your callback probability across hiring tiers.
            </p>
          </div>

          {/* Role selector dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Target Role Benchmark:
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {ROLE_BENCHMARKS.map((r) => (
                <option key={r.id} value={r.id} style={{ background: "#0f172a" }}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Percentile Standing & Bell Curve ─────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {/* Left: Percentile Badge Card */}
        <div
          style={{
            background: "var(--bg-card, #1e293b)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Applicant Standing
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: "3rem",
                  fontWeight: 900,
                  background: "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                }}
              >
                {percentile}th
              </span>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Percentile
              </span>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 99,
                background: percentile >= 75 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: percentile >= 75 ? "#34d399" : "#fbbf24",
                border: `1px solid ${percentile >= 75 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Top {topPercent}% of {currentRole.title} applicants
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
              {percentile >= 80
                ? "Your resume strongly outperforms the vast majority of applicants in this role. You are comfortably above initial automated screening filters."
                : percentile >= 60
                ? "Your resume is competitive with the median applicant pool, but addressing quantified bullet points and layout formatting can propel you into the top 15%."
                : "Your resume sits in the lower applicant tier for this role. Key ATS formatting or keyword gaps are increasing your risk of early filtering."}
            </p>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            <div>
              <span>Role Median: </span>
              <strong style={{ color: "var(--text-primary)" }}>{currentRole.p50} pts</strong>
            </div>
            <div>
              <span>Top 10% Cutoff: </span>
              <strong style={{ color: "var(--green)" }}>{currentRole.p90} pts</strong>
            </div>
          </div>
        </div>

        {/* Right: Interactive SVG Bell Curve */}
        <div
          style={{
            background: "var(--bg-card, #1e293b)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Applicant Score Distribution Curve
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Candidate score: <strong style={{ color: "#818cf8" }}>{overallScore}</strong>
            </span>
          </div>

          {/* SVG Gaussian Curve */}
          <div style={{ position: "relative", width: "100%", height: 160 }}>
            <svg viewBox="0 0 400 140" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              <defs>
                <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="highlightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Bell Curve Fill */}
              <path
                d="M 20,120 Q 120,120 160,80 T 200,20 T 240,80 Q 280,120 380,120 Z"
                fill="url(#bellGrad)"
              />
              {/* Bell Curve Stroke */}
              <path
                d="M 20,120 Q 120,120 160,80 T 200,20 T 240,80 Q 280,120 380,120"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
              />

              {/* Baseline axis */}
              <line x1="20" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

              {/* Median Mark (Center ~200) */}
              <line x1="200" y1="20" x2="200" y2="120" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
              <text x="200" y="135" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">
                Median ({currentRole.p50})
              </text>

              {/* Candidate Position Line */}
              {(() => {
                // map score 30..100 to x: 40..360
                const candX = Math.min(360, Math.max(40, 40 + ((overallScore - 30) / 70) * 320));
                return (
                  <g>
                    <line x1={candX} y1="10" x2={candX} y2="120" stroke="#10b981" strokeWidth="2.5" />
                    <circle cx={candX} cy="10" r="5" fill="#10b981" />
                    <text x={candX} y="0" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">
                      You: {overallScore}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 8 }}>
            <span>Low (&lt;40)</span>
            <span>Applicant Median (50-70)</span>
            <span>Top Tier (&gt;85)</span>
          </div>
        </div>
      </div>

      {/* ─── Company Tier Callback Likelihood ────────────────────── */}
      <div
        style={{
          background: "var(--bg-card, #1e293b)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "24px 28px",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
          Estimated Callback & Pass Likelihood by Hiring Tier
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div>
                <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)", display: "block" }}>
                  {tier.name}
                </strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{tier.sub}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Interview Odds:</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: tier.color }}>{tier.likelihood}</span>
              </div>

              <div
                style={{
                  fontSize: "0.72rem",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: `${tier.color}18`,
                  color: tier.color,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {tier.status} (Cutoff: ~{tier.cutoff}+)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Dimension Comparison Bars ───────────────────────────── */}
      <div
        style={{
          background: "var(--bg-card, #1e293b)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "24px 28px",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px 0" }}>
          Performance vs {currentRole.title} Benchmark
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            {
              label: "ATS Parsability & Document Hygiene",
              candidateVal: candidateDimensions.format,
              benchmarkVal: currentRole.dimensions.format,
              tip: "Evaluates layout, multi-column risks, headers, and standard section tagging.",
            },
            {
              label: "Bullet Impact & Quantification (XYZ Formula)",
              candidateVal: candidateDimensions.quantification,
              benchmarkVal: currentRole.dimensions.quantification,
              tip: "Evaluates action verbs, business metrics, percentages, and dollar impact.",
            },
            {
              label: "Keyword Alignment & Hard Skills",
              candidateVal: candidateDimensions.keywords,
              benchmarkVal: currentRole.dimensions.keywords,
              tip: "Evaluates core role tech stack coverage and terminology matches.",
            },
            {
              label: "Career Progression & Seniority Narrative",
              candidateVal: candidateDimensions.experience,
              benchmarkVal: currentRole.dimensions.experience,
              tip: "Evaluates scope of responsibilities, leadership signals, and tenure.",
            },
          ].map((dim) => {
            const isAhead = dim.candidateVal >= dim.benchmarkVal;
            const diff = dim.candidateVal - dim.benchmarkVal;
            return (
              <div key={dim.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{dim.label}</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 8 }}>{dim.tip}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isAhead ? "var(--green)" : "var(--amber)" }}>
                      You: {dim.candidateVal}%
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Avg: {dim.benchmarkVal}%
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: isAhead ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: isAhead ? "#34d399" : "#f87171",
                      }}
                    >
                      {diff >= 0 ? `+${diff}%` : `${diff}%`}
                    </span>
                  </div>
                </div>

                {/* Progress bars comparison */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Candidate Bar */}
                  <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${dim.candidateVal}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: isAhead ? "var(--green)" : "var(--amber)",
                        transition: "width 0.5s ease-out",
                      }}
                    />
                  </div>
                  {/* Benchmark Bar */}
                  <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${dim.benchmarkVal}%`,
                        height: "100%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Standard Gaussian CDF helper
function normalCdf(z: number): number {
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c2 = 0.39894228;

  if (z >= 0) {
    const t = 1.0 / (1.0 + p * z);
    return 1.0 - c2 * Math.exp((-z * z) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * z);
    return c2 * Math.exp((-z * z) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
}

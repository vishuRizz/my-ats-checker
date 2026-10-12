"use client";

import { useState } from "react";
import type { ScoreBreakdown, ScoreCategory } from "@/types";

export function ScorePanel({ scoreBreakdown }: { scoreBreakdown: ScoreBreakdown }) {
  const categories: ScoreCategory[] = [
    scoreBreakdown.parseIntegrity,
    scoreBreakdown.formattingRisks,
    scoreBreakdown.bulletQuality,
    ...(scoreBreakdown.keywordCoverage ? [scoreBreakdown.keywordCoverage] : []),
    ...(scoreBreakdown.experienceRelevance ? [scoreBreakdown.experienceRelevance] : []),
  ];

  // Map of category index + item index to whether the user simulated fixing it
  const [fixedItems, setFixedItems] = useState<Record<string, boolean>>({});

  const toggleFix = (catIndex: number, itemIndex: number) => {
    const key = `${catIndex}-${itemIndex}`;
    setFixedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (shouldFixAll: boolean) => {
    const newFixed: Record<string, boolean> = {};
    if (shouldFixAll) {
      categories.forEach((cat, catIdx) => {
        cat.items.forEach((_, itemIdx) => {
          newFixed[`${catIdx}-${itemIdx}`] = true;
        });
      });
    }
    setFixedItems(newFixed);
  };

  // Compute simulated score dynamically based on weight and items fixed
  const simulatedCategories = categories.map((cat, catIdx) => {
    const totalDeductionsInCat = cat.items.reduce((sum, item) => sum + item.pointsLost, 0);
    const restoredPointsInCat = cat.items.reduce((sum, item, itemIdx) => {
      const isFixed = fixedItems[`${catIdx}-${itemIdx}`];
      return sum + (isFixed ? item.pointsLost : 0);
    }, 0);

    const simulatedCatScore = Math.min(100, cat.score + restoredPointsInCat);
    return {
      ...cat,
      simulatedScore: simulatedCatScore,
      restoredPoints: restoredPointsInCat,
    };
  });

  const simulatedOverallScore = Math.min(
    100,
    Math.round(simulatedCategories.reduce((sum, cat) => sum + cat.simulatedScore * cat.weight, 0))
  );

  const potentialOverallScore = Math.min(
    100,
    Math.round(
      categories.reduce((sum, cat) => {
        const fullCatScore = Math.min(
          100,
          cat.score + cat.items.reduce((s, it) => s + it.pointsLost, 0)
        );
        return sum + fullCatScore * cat.weight;
      }, 0)
    )
  );

  const totalDeductionItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const fixedCount = Object.values(fixedItems).filter(Boolean).length;
  const scoreDelta = simulatedOverallScore - scoreBreakdown.overall;

  const getScoreColor = (val: number) =>
    val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── Interactive Simulator Hero Card ─────────────────────────── */}
      <div
        style={{
          padding: "28px 32px",
          borderRadius: 16,
          background: "linear-gradient(135deg, #090d16 0%, #131722 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 28,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Current Score */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#71717a",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Current ATS Score
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{
                  fontSize: "2.8rem",
                  fontWeight: 900,
                  color: getScoreColor(scoreBreakdown.overall),
                  lineHeight: 1,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {scoreBreakdown.overall}
              </span>
              <span style={{ fontSize: "1.1rem", color: "#52525b" }}>/ 100</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#a1a1aa", marginTop: 8 }}>
              {scoreBreakdown.overall >= 80
                ? "Excellent ATS pass readiness."
                : scoreBreakdown.overall >= 60
                ? "Moderate score — some critical blockers."
                : "High risk of automated filter rejection."}
            </div>
          </div>

          {/* Arrow / Divider */}
          <div style={{ textAlign: "center", padding: "0 10px" }}>
            <div
              style={{
                fontSize: "1.6rem",
                color: scoreDelta > 0 ? "#10b981" : "#52525b",
                transition: "all 0.3s ease",
              }}
            >
              ➔
            </div>
            {scoreDelta > 0 && (
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#10b981",
                  background: "rgba(16,185,129,0.12)",
                  padding: "3px 10px",
                  borderRadius: 99,
                  border: "1px solid rgba(16,185,129,0.3)",
                  display: "inline-block",
                  marginTop: 6,
                }}
              >
                +{scoreDelta} pts
              </span>
            )}
          </div>

          {/* Simulated Potential Score */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#a1a1aa",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Simulated Potential Score
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{
                  fontSize: "2.8rem",
                  fontWeight: 900,
                  color: getScoreColor(simulatedOverallScore),
                  lineHeight: 1,
                  fontFamily: "var(--font-mono, monospace)",
                  transition: "all 0.3s ease",
                }}
              >
                {simulatedOverallScore}
              </span>
              <span style={{ fontSize: "1.1rem", color: "#52525b" }}>/ 100</span>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "#a1a1aa",
                  background: "rgba(255,255,255,0.06)",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                Max: {potentialOverallScore}
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#71717a", marginTop: 8 }}>
              {fixedCount === 0
                ? "Check the boxes below to simulate how fixes boost your score."
                : `${fixedCount} of ${totalDeductionItems} recommendations simulated.`}
            </div>
          </div>
        </div>

        {/* Quick simulator action bar */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "#a1a1aa" }}>
            💡 <strong>Score Fix Simulator:</strong> Toggle fixes to prioritize what moves the needle fastest.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => toggleAll(true)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: 600,
                background: "rgba(16,185,129,0.12)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.3)",
                cursor: "pointer",
              }}
            >
              Simulate Fixing All
            </button>
            <button
              onClick={() => toggleAll(false)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: 600,
                background: "rgba(255,255,255,0.04)",
                color: "#a1a1aa",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}
            >
              Reset Simulator
            </button>
          </div>
        </div>
      </div>

      {/* Formula note */}
      <div
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          fontSize: "0.82rem",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: "1rem" }}>📐</span>
        <div>
          <strong style={{ color: "var(--text-primary)" }}>Deterministic Scoring Formula: </strong>
          {scoreBreakdown.scoreFormula}
        </div>
      </div>

      {/* ─── Category Breakdown Cards ─────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {simulatedCategories.map((cat, catIdx) => {
          const catScore = cat.simulatedScore;
          const catColor = getScoreColor(catScore);

          return (
            <div
              key={catIdx}
              className="card"
              style={{
                padding: 24,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
            >
              {/* Category Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3
                      style={{
                        fontSize: "1.15rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {cat.name}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        background: "var(--bg-elevated)",
                        padding: "2px 8px",
                        borderRadius: 99,
                        border: "1px solid var(--border)",
                      }}
                    >
                      Weight: {Math.round(cat.weight * 100)}%
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {cat.items.length === 0
                      ? "Zero issues found in this category."
                      : `${cat.items.length} finding${cat.items.length > 1 ? "s" : ""} affecting your score`}
                  </p>
                </div>

                {/* Category Score Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {cat.restoredPoints > 0 && (
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#10b981",
                        background: "rgba(16,185,129,0.1)",
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(16,185,129,0.25)",
                      }}
                    >
                      +{cat.restoredPoints} pts simulated
                    </span>
                  )}
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      color: catColor,
                      background: `color-mix(in srgb, ${catColor} 12%, transparent)`,
                      padding: "6px 14px",
                      borderRadius: 10,
                      border: `1px solid color-mix(in srgb, ${catColor} 30%, transparent)`,
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {catScore}/100
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: 6,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 99,
                  overflow: "hidden",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: `${catScore}%`,
                    height: "100%",
                    background: catColor,
                    borderRadius: 99,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Deduction items list */}
              {cat.items.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {cat.items.map((item, itemIdx) => {
                    const key = `${catIdx}-${itemIdx}`;
                    const isFixed = Boolean(fixedItems[key]);
                    const sevColor =
                      item.severity === "critical"
                        ? "#ef4444"
                        : item.severity === "warning"
                        ? "#f59e0b"
                        : "#3b82f6";

                    return (
                      <div
                        key={itemIdx}
                        onClick={() => toggleFix(catIdx, itemIdx)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto auto 1fr",
                          gap: 14,
                          alignItems: "start",
                          padding: "14px 16px",
                          borderRadius: 10,
                          background: isFixed ? "rgba(16,185,129,0.05)" : "var(--bg-elevated)",
                          border: `1px solid ${
                            isFixed ? "rgba(16,185,129,0.3)" : "var(--border)"
                          }`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {/* Simulation Checkbox */}
                        <div
                          style={{
                            marginTop: 3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isFixed}
                            onChange={() => {}} // handled by parent onClick
                            style={{
                              cursor: "pointer",
                              width: 16,
                              height: 16,
                              accentColor: "#10b981",
                            }}
                          />
                        </div>

                        {/* Points pill */}
                        <div
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: isFixed ? "rgba(16,185,129,0.15)" : `${sevColor}15`,
                            color: isFixed ? "#10b981" : sevColor,
                            border: `1px solid ${isFixed ? "#10b981" : sevColor}33`,
                            fontFamily: "var(--font-mono, monospace)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isFixed ? `+${item.pointsLost} restored` : `-${item.pointsLost} pts`}
                        </div>

                        {/* Content & Actionable Fix */}
                        <div>
                          <div
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 600,
                              color: isFixed ? "#10b981" : "var(--text-primary)",
                              textDecoration: isFixed ? "line-through" : "none",
                              marginBottom: 6,
                            }}
                          >
                            {item.description}
                          </div>

                          {item.fix && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 6,
                                fontSize: "0.82rem",
                                color: "var(--text-secondary)",
                                lineHeight: 1.5,
                              }}
                            >
                              <span style={{ fontSize: "0.85rem" }}>🔧</span>
                              <span>
                                <strong style={{ color: "var(--text-primary)" }}>How to fix: </strong>
                                {item.fix}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    padding: "14px 18px",
                    borderRadius: 10,
                    color: "#10b981",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>✅</span> Perfect score! Zero deductions detected in this category.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

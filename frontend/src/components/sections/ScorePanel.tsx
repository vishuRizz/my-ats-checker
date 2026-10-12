"use client";

import type { ScoreBreakdown, ScoreCategory } from "@/types";

export function ScorePanel({ scoreBreakdown }: { scoreBreakdown: ScoreBreakdown }) {
  const categories = [
    scoreBreakdown.parseIntegrity,
    scoreBreakdown.formattingRisks,
    scoreBreakdown.bulletQuality,
    ...(scoreBreakdown.keywordCoverage ? [scoreBreakdown.keywordCoverage] : []),
    ...(scoreBreakdown.experienceRelevance ? [scoreBreakdown.experienceRelevance] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
        This is a deterministic score based on specific parse artifacts and keyword matches. 
        Each category is weighted to produce the final score. <strong>No magic numbers.</strong>
      </p>

      <div style={{
        padding: "12px 16px", borderRadius: 8, background: "var(--bg-elevated)",
        border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.55,
      }}>
        <strong style={{ color: "var(--text-primary)" }}>Formula: </strong>
        {scoreBreakdown.scoreFormula}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        {categories.map((cat, i) => (
          <CategoryCard key={i} category={cat} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: ScoreCategory }) {
  const { name, score, weight, items } = category;

  const color = 
    score >= 80 ? "var(--green)" : 
    score >= 60 ? "var(--amber)" : 
    "var(--red)";

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            {name}
          </h3>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Weight: {Math.round(weight * 100)}% of total score
          </span>
        </div>
        <div style={{ 
          fontSize: "1.8rem", fontWeight: 800, color,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          padding: "8px 16px", borderRadius: 12,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`
        }}>
          {score}/100
        </div>
      </div>

      {items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: 4 }}>
            Deductions & Findings
          </h4>
          {items.map((item, i) => (
            <div key={i} style={{ 
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 16,
              background: "var(--bg-elevated)", padding: 16, borderRadius: 8,
              borderLeft: `3px solid var(--${
                item.severity === "critical" ? "red" : item.severity === "warning" ? "amber" : "blue"
              })`
            }}>
              <div style={{ 
                color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600, fontFamily: "var(--font-mono)",
                marginTop: 2
              }}>
                -{item.pointsLost}
              </div>
              <div>
                <p style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 500, margin: "0 0 8px 0" }}>
                  {item.description}
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.9rem" }}>🛠️</span>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                    {item.fix}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          background: "var(--green-dim)", border: "1px solid rgba(16,185,129,0.3)", 
          padding: 16, borderRadius: 8, color: "var(--green)", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span>✅</span> Perfect score in this category.
        </div>
      )}
    </div>
  );
}

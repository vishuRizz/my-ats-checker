"use client";

import type { RuleResult } from "@/types";

export function RulesPanel({ rules }: { rules: RuleResult[] }) {
  if (rules.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Perfect Formatting!
        </h3>
        <p style={{ color: "var(--text-secondary)" }}>
          We didn't detect any formatting risks or unparseable elements.
        </p>
      </div>
    );
  }

  // Sort: Critical first, then warnings, then info
  const sorted = [...rules].sort((a, b) => {
    const weights = { critical: 3, warning: 2, info: 1 };
    return weights[b.severity] - weights[a.severity];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sorted.map((rule, idx) => (
        <div
          key={idx}
          className="card"
          style={{
            padding: 24,
            borderLeft: `4px solid var(--${
              rule.severity === "critical" ? "red" : rule.severity === "warning" ? "amber" : "blue"
            })`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span className={`badge-${rule.severity}`} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {rule.severity}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  -{rule.pointsLost} pts
                </span>
              </div>

              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                {rule.message}
              </h3>
              
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 16 }}>
                {rule.explanation}
              </p>

              <div style={{
                background: "var(--bg-elevated)", padding: "12px 16px",
                borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
              }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
                  🛠️ How to fix:
                </strong>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
                  {rule.fix}
                </p>
              </div>
            </div>

            {/* If rule has location data */}
            {rule.location && (
              <div style={{
                background: "var(--bg-elevated)", padding: "8px 12px", borderRadius: 8,
                fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap"
              }}>
                Page {rule.location.page}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { KeywordReport as KeywordReportType, KeywordMatch } from "@/types";

export function SkillGapPanel({ report }: { report: KeywordReportType }) {
  const [filter, setFilter] = useState<"all" | "required" | "nice" | "missing">("all");
  const [view, setView] = useState<"visual" | "list">("visual");
  const [search, setSearch] = useState("");

  const { matched, missing, matchRate, requiredMatchRate, niceToHaveMatchRate, semanticMatches } = report;

  const rMatched = matched.filter((m) => m.isRequired && !m.isSoft);
  const rMissing = missing.filter((m) => m.isRequired && !m.isSoft);
  const nMatched = matched.filter((m) => !m.isRequired);
  const nMissing = missing.filter((m) => !m.isRequired);
  const totalR = rMatched.length + rMissing.length;
  const totalN = nMatched.length + nMissing.length;
  const totalAll = totalR + totalN;
  const totalMatchedAll = rMatched.length + nMatched.length;

  // Filter selection
  let fMatched = filter === "required" ? rMatched : filter === "nice" ? nMatched : filter === "missing" ? [] : matched;
  let fMissing = filter === "required" ? rMissing : filter === "nice" ? nMissing : missing;

  // Search query filter
  if (search.trim()) {
    const q = search.toLowerCase();
    fMatched = fMatched.filter((m) => m.keyword.toLowerCase().includes(q));
    fMissing = fMissing.filter((m) => m.keyword.toLowerCase().includes(q));
  }

  const overallColor = matchRate >= 75 ? "#10b981" : matchRate >= 50 ? "#f59e0b" : "#ef4444";
  const reqColor = requiredMatchRate >= 80 ? "#10b981" : requiredMatchRate >= 55 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── Hero Overview Card ─────────────────────────────────────── */}
      <div
        style={{
          padding: "28px 32px",
          borderRadius: 16,
          background: "linear-gradient(135deg, #090d16 0%, #131722 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 32,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Ring value={matchRate} color={overallColor} />
          <div>
            <div
              style={{
                fontSize: "0.76rem",
                color: "#71717a",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              Overall JD Match
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>
              {totalMatchedAll}
              <span style={{ fontSize: "1.05rem", color: "#52525b", fontWeight: 500 }}>
                {" "}
                / {totalAll}
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#71717a", marginTop: 4 }}>
              keywords matched from job description
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 74, background: "rgba(255,255,255,0.08)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Bar label="Required Skills" matched={rMatched.length} total={totalR} color={reqColor} />
          <Bar
            label="Nice-to-Have Skills"
            matched={nMatched.length}
            total={totalN}
            color="#3b82f6"
          />
          {semanticMatches && semanticMatches.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ fontSize: "0.8rem", color: "#a855f7", fontWeight: 600 }}>
                🧠 Semantic Matches (AI-detected):
              </span>
              <span style={{ fontSize: "0.8rem", color: "#a855f7", fontWeight: 700 }}>
                {semanticMatches.length} near-matches
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Smart Verdict Banner ───────────────────────────────────── */}
      <Verdict requiredMatchRate={requiredMatchRate} rMissing={rMissing} />

      {/* ─── Controls: Filter Tabs, Search, View Toggle ─────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(
            [
              { id: "all", label: `All (${totalAll})` },
              { id: "required", label: `Required (${totalR})` },
              { id: "nice", label: `Nice-to-Have (${totalN})` },
              { id: "missing", label: `Missing (${missing.length})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                border: `1px solid ${
                  filter === f.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"
                }`,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                background: filter === f.id ? "rgba(255,255,255,0.1)" : "transparent",
                color: filter === f.id ? "#ffffff" : "#71717a",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & View Mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              width: 140,
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", padding: 3, borderRadius: 8 }}>
            {(["visual", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: view === v ? "rgba(255,255,255,0.12)" : "transparent",
                  color: view === v ? "#ffffff" : "#71717a",
                  transition: "all 0.15s",
                }}
              >
                {v === "visual" ? "Matrix" : "Audit List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main Content (Matrix or List) ──────────────────────────── */}
      {view === "visual" ? (
        <Grid matched={fMatched} missing={fMissing} />
      ) : (
        <SkillList matched={fMatched} missing={fMissing} />
      )}

      {/* ─── AI Semantic Matches Section ────────────────────────────── */}
      {semanticMatches && semanticMatches.length > 0 && (
        <div
          style={{
            padding: 22,
            borderRadius: 14,
            background: "rgba(168,85,247,0.04)",
            border: "1px solid rgba(168,85,247,0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span>🧠</span>
            <h3 style={{ fontWeight: 700, color: "#a855f7", fontSize: "0.95rem", margin: 0 }}>
              AI Semantic Matches (Groq-Detected Near-Matches)
            </h3>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#c084fc",
                background: "rgba(168,85,247,0.12)",
                padding: "2px 8px",
                borderRadius: 99,
              }}
            >
              Found aliases & variations
            </span>
          </div>

          <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#a1a1aa", lineHeight: 1.5 }}>
            These terms represent the same conceptual competency but were spelled differently. Note: Some strict ATS parsers do exact string matching only. To guarantee full ATS credit, consider writing the exact keyword in parentheses (e.g. <em>"K8s (Kubernetes)"</em>).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {semanticMatches.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#a855f7", fontWeight: 700 }}>~</span>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff" }}>"{m.jdKeyword}"</span>
                  <span style={{ color: "#71717a", fontSize: "0.82rem" }}>found in resume as</span>
                  <span style={{ fontWeight: 700, color: "#c084fc" }}>"{m.resumeTerm}"</span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#a855f7",
                    background: "rgba(168,85,247,0.1)",
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  {Math.round(m.similarity * 100)}% Match Confidence
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 37,
    c = 2 * Math.PI * r;
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle
        cx={45}
        cy={45}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={c}
        strokeDashoffset={c - (value / 100) * c}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={45} y={50} textAnchor="middle" fill={color} fontSize={16} fontWeight={800}>
        {value}%
      </text>
    </svg>
  );
}

function Bar({
  label,
  matched,
  total,
  color,
}: {
  label: string;
  matched: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (matched / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: "0.82rem", color: "#a1a1aa" }}>{label}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color }}>
          {matched}/{total} ({Math.round(pct)}%)
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function Verdict({
  requiredMatchRate,
  rMissing,
}: {
  requiredMatchRate: number;
  rMissing: KeywordMatch[];
}) {
  const top = rMissing
    .slice(0, 4)
    .map((m) => m.keyword)
    .join(", ");

  if (requiredMatchRate >= 85) {
    return (
      <div
        style={{
          padding: "16px 22px",
          borderRadius: 12,
          background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.2)",
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>🎯</span>
        <div>
          <div style={{ fontWeight: 700, color: "#10b981", fontSize: "0.95rem" }}>
            High ATS Readiness ({requiredMatchRate}% of required criteria met)
          </div>
          <div style={{ color: "#a1a1aa", fontSize: "0.84rem", marginTop: 2 }}>
            Your resume strongly matches the core requirements for this position. You will easily clear automated screening filters.
          </div>
        </div>
      </div>
    );
  }

  if (requiredMatchRate >= 60) {
    return (
      <div
        style={{
          padding: "16px 22px",
          borderRadius: 12,
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>⚡</span>
        <div>
          <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: "0.95rem" }}>
            Moderate Match ({requiredMatchRate}% of required criteria met) — Address Key Gaps
          </div>
          <div style={{ color: "#a1a1aa", fontSize: "0.84rem", marginTop: 2 }}>
            Missing top required skills: <strong style={{ color: "#ffffff" }}>{top || "none"}</strong>.
            If you have genuine experience with these, add them into your experience bullets to increase your interview chances.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px 22px",
        borderRadius: 12,
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.2)",
        display: "flex",
        gap: 14,
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: "1.5rem" }}>🚨</span>
      <div>
        <div style={{ fontWeight: 700, color: "#ef4444", fontSize: "0.95rem" }}>
          Significant Skill Gap — {100 - requiredMatchRate}% of required criteria missing
        </div>
        <div style={{ color: "#a1a1aa", fontSize: "0.84rem", marginTop: 2 }}>
          Missing essential requirements: <strong style={{ color: "#ffffff" }}>{top || "none"}</strong>.
          Without these keywords, most ATS algorithms will route this resume to auto-reject.
        </div>
      </div>
    </div>
  );
}

function Chip({
  keyword,
  placement,
  matched,
  isRequired,
}: {
  keyword: string;
  placement: string;
  matched: boolean;
  isRequired: boolean;
}) {
  const color = !matched
    ? isRequired
      ? "#ef4444"
      : "#71717a"
    : placement === "bullet_with_context"
    ? "#10b981"
    : placement === "projects_context"
    ? "#3b82f6"
    : "#f59e0b";

  const label = !matched
    ? isRequired
      ? "✕ Missing (Required)"
      : "— Missing"
    : placement === "bullet_with_context"
    ? "✓ In Bullet Context"
    : placement === "projects_context"
    ? "✓ In Projects"
    : "✓ Skills List Only";

  return (
    <div
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 99,
        border: `1px solid ${color}30`,
        background: `${color}12`,
        color,
        fontSize: "0.83rem",
        fontWeight: 600,
        cursor: "default",
      }}
    >
      <span>{keyword}</span>
      {isRequired && !matched && (
        <span
          style={{
            fontSize: "0.68rem",
            background: "rgba(239,68,68,0.2)",
            padding: "1px 6px",
            borderRadius: 99,
            color: "#fca5a5",
          }}
        >
          Required
        </span>
      )}
    </div>
  );
}

function Grid({ matched, missing }: { matched: KeywordMatch[]; missing: KeywordMatch[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {matched.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Verified in your resume ({matched.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {matched.map((m, i) => (
              <Chip
                key={i}
                keyword={m.keyword}
                placement={m.placement}
                matched={true}
                isRequired={m.isRequired}
              />
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Missing from your resume ({missing.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {missing.map((m, i) => (
              <Chip
                key={i}
                keyword={m.keyword}
                placement="missing"
                matched={false}
                isRequired={m.isRequired}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillList({ matched, missing }: { matched: KeywordMatch[]; missing: KeywordMatch[] }) {
  const all = [
    ...matched.map((m) => ({ ...m, matched: true })),
    ...missing.map((m) => ({ ...m, matched: false })),
  ].sort((a, b) => (b.isRequired ? 1 : 0) - (a.isRequired ? 1 : 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {all.map((m, i) => {
        const label = !m.matched
          ? "Missing"
          : m.placement === "bullet_with_context"
          ? "Strong Context (Experience Bullet)"
          : m.placement === "projects_context"
          ? "Project Context"
          : "Skills List Only";

        const color = !m.matched
          ? m.isRequired
            ? "#ef4444"
            : "#71717a"
          : m.placement === "bullet_with_context"
          ? "#10b981"
          : m.placement === "projects_context"
          ? "#3b82f6"
          : "#f59e0b";

        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "14px 18px",
              borderRadius: 10,
              background: "var(--bg-elevated)",
              border: `1px solid ${m.matched ? "var(--border)" : "rgba(239,68,68,0.15)"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontWeight: 700, color: "var(--text-primary)", fontSize: "0.92rem" }}>
                {m.keyword}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: m.isRequired ? "#fca5a5" : "#a1a1aa",
                  background: m.isRequired ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                  padding: "2px 8px",
                  borderRadius: 99,
                }}
              >
                {m.isRequired ? "Required" : "Nice-to-Have"}
              </div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color, minWidth: 140, textAlign: "right" }}>
                {label}
              </div>
            </div>

            {/* Resume Context Snippet */}
            {m.context && (
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                  background: "var(--bg-card)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  borderLeft: `3px solid ${color}`,
                  marginLeft: 22,
                }}
              >
                "...{m.context.trim()}..."
              </div>
            )}

            {!m.matched && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#a1a1aa",
                  marginLeft: 22,
                }}
              >
                💡 Recommendation: Add "{m.keyword}" into an experience or projects bullet with quantifiable metrics.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

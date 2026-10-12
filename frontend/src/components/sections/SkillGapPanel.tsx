"use client";

import { useState } from "react";
import type { KeywordReport as KeywordReportType, KeywordMatch } from "@/types";

export function SkillGapPanel({ report }: { report: KeywordReportType }) {
  const [filter, setFilter] = useState<"all" | "required" | "nice">("all");
  const [view, setView] = useState<"visual" | "list">("visual");
  const { matched, missing, matchRate, requiredMatchRate, semanticMatches, semanticMatchRate } = report;

  const rMatched = matched.filter((m) => m.isRequired && !m.isSoft);
  const rMissing = missing.filter((m) => m.isRequired && !m.isSoft);
  const nMatched = matched.filter((m) => !m.isRequired);
  const nMissing = missing.filter((m) => !m.isRequired);
  const totalR = rMatched.length + rMissing.length;
  const totalN = nMatched.length + nMissing.length;
  const totalAll = totalR + totalN;
  const totalMatchedAll = rMatched.length + nMatched.length;

  const fMatched = filter === "required" ? rMatched : filter === "nice" ? nMatched : matched;
  const fMissing = filter === "required" ? rMissing : filter === "nice" ? nMissing : missing;

  const overallColor = matchRate >= 75 ? "#10b981" : matchRate >= 50 ? "#f59e0b" : "#ef4444";
  const reqColor = requiredMatchRate >= 80 ? "#10b981" : requiredMatchRate >= 55 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{
        padding: "28px 32px", borderRadius: 16,
        background: "linear-gradient(135deg, #0f172a 0%, #18181b 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 32, alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Ring value={matchRate} color={overallColor} />
          <div>
            <div style={{ fontSize: "0.78rem", color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Overall Match</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>
              {totalMatchedAll}<span style={{ fontSize: "1rem", color: "#52525b", fontWeight: 500 }}> / {totalAll}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#52525b", marginTop: 4 }}>keywords from JD</div>
          </div>
        </div>
        <div style={{ width: 1, height: 70, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Bar label="Required Skills" matched={rMatched.length} total={totalR} color={reqColor} />
          <Bar label="Nice-to-Have" matched={nMatched.length} total={totalN} color="#3b82f6" />
          {semanticMatches && semanticMatches.length > 0 && (
            <Bar label="Semantic (AI)" matched={semanticMatches.length} total={semanticMatches.length} color="#a855f7" />
          )}
        </div>
      </div>

      <Verdict requiredMatchRate={requiredMatchRate} rMissing={rMissing} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "required", "nice"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 16px", borderRadius: 99, border: `1px solid ${filter === f ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`,
              fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
              background: filter === f ? "rgba(255,255,255,0.1)" : "transparent",
              color: filter === f ? "#ffffff" : "#71717a",
            }}>
              {f === "all" ? `All (${totalAll})` : f === "required" ? `Required (${totalR})` : `Nice-to-Have (${totalN})`}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["visual", "list"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 12px", borderRadius: 8,
              border: `1px solid ${view === v ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
              background: view === v ? "rgba(255,255,255,0.08)" : "transparent",
              color: view === v ? "#d4d4d8" : "#52525b",
            }}>
              {v === "visual" ? "Grid" : "List"}
            </button>
          ))}
        </div>
      </div>

      {view === "visual" ? <Grid matched={fMatched} missing={fMissing} /> : <SkillList matched={fMatched} missing={fMissing} />}

      {semanticMatches && semanticMatches.length > 0 && (
        <div style={{ padding: 20, borderRadius: 14, background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span>🧠</span>
            <h3 style={{ fontWeight: 700, color: "#a855f7", fontSize: "0.95rem", margin: 0 }}>AI Semantic Matches</h3>
            <span style={{ fontSize: "0.75rem", color: "#52525b", background: "rgba(168,85,247,0.1)", padding: "2px 8px", borderRadius: 99 }}>Same meaning, different words</span>
          </div>
          {semanticMatches.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6 }}>
              <span style={{ color: "#a855f7", fontWeight: 700 }}>~</span>
              <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: "#d4d4d8" }}>"{m.jdKeyword}"</span>
                <span style={{ color: "#52525b", fontSize: "0.82rem" }}>found as</span>
                <span style={{ fontWeight: 600, color: "#d4d4d8" }}>"{m.resumeTerm}"</span>
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a855f7" }}>{Math.round(m.similarity * 100)}%</div>
              <div style={{ fontSize: "0.72rem", color: "#52525b", fontStyle: "italic" }}>Add exact term to be safe</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 37, c = 2 * Math.PI * r;
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={c} strokeDashoffset={c - (value / 100) * c}
        strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={45} y={50} textAnchor="middle" fill={color} fontSize={16} fontWeight={800}>{value}%</text>
    </svg>
  );
}

function Bar({ label, matched, total, color }: { label: string; matched: number; total: number; color: string }) {
  const pct = total > 0 ? (matched / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: "0.82rem", color: "#a1a1aa" }}>{label}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color }}>{matched}/{total}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function Verdict({ requiredMatchRate, rMissing }: { requiredMatchRate: number; rMissing: KeywordMatch[] }) {
  const top = rMissing.slice(0, 5).map((m) => m.keyword).join(", ");
  if (requiredMatchRate >= 85) return (
    <div style={{ padding: "14px 20px", borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", gap: 12 }}>
      <span>🎯</span>
      <div><div style={{ fontWeight: 700, color: "#10b981" }}>Strong match!</div>
        <div style={{ color: "#52525b", fontSize: "0.83rem" }}>You meet {requiredMatchRate}% of required criteria. Well positioned for this role.</div></div>
    </div>
  );
  if (requiredMatchRate >= 60) return (
    <div style={{ padding: "14px 20px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", gap: 12 }}>
      <span>⚡</span>
      <div><div style={{ fontWeight: 700, color: "#f59e0b" }}>Partial match - add missing keywords</div>
        <div style={{ color: "#52525b", fontSize: "0.83rem" }}>Top missing: <strong style={{ color: "#d4d4d8" }}>{top || "none"}</strong>. Add these if you genuinely have them.</div></div>
    </div>
  );
  return (
    <div style={{ padding: "14px 20px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: 12 }}>
      <span>🚨</span>
      <div><div style={{ fontWeight: 700, color: "#ef4444" }}>Significant gap - {100 - requiredMatchRate}% of required skills missing</div>
        <div style={{ color: "#52525b", fontSize: "0.83rem" }}>Missing: <strong style={{ color: "#d4d4d8" }}>{top || "none"}</strong>. Resume may get filtered before human review.</div></div>
    </div>
  );
}

function Chip({ keyword, placement, matched, isRequired }: { keyword: string; placement: string; matched: boolean; isRequired: boolean }) {
  const color = !matched ? (isRequired ? "#ef4444" : "#71717a") : placement === "bullet_with_context" ? "#10b981" : placement === "projects_context" ? "#3b82f6" : "#f59e0b";
  const icon = !matched ? (isRequired ? "x" : "-") : placement === "bullet_with_context" ? "vv" : "v";
  return (
    <div title={!matched ? (isRequired ? "Required - missing" : "Nice-to-have - missing") : `Found: ${placement.replace(/_/g, " ")}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, border: `1px solid ${color}30`, background: `${color}12`, color, fontSize: "0.83rem", fontWeight: 600, cursor: "default" }}>
      <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{icon}</span>{keyword}
    </div>
  );
}

function Grid({ matched, missing }: { matched: KeywordMatch[]; missing: KeywordMatch[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {matched.length > 0 && (
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Found in your resume ({matched.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {matched.map((m, i) => <Chip key={i} keyword={m.keyword} placement={m.placement} matched={true} isRequired={m.isRequired} />)}
          </div>
        </div>
      )}
      {missing.length > 0 && (
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Missing from your resume ({missing.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {missing.map((m, i) => <Chip key={i} keyword={m.keyword} placement="missing" matched={false} isRequired={m.isRequired} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillList({ matched, missing }: { matched: KeywordMatch[]; missing: KeywordMatch[] }) {
  const all = [...matched.map((m) => ({ ...m, matched: true })), ...missing.map((m) => ({ ...m, matched: false }))].sort((a, b) => (b.isRequired ? 1 : 0) - (a.isRequired ? 1 : 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {all.map((m, i) => {
        const label = !m.matched ? "Missing" : m.placement === "bullet_with_context" ? "Strong Context" : m.placement === "projects_context" ? "Project Context" : "Skills List";
        const color = !m.matched ? (m.isRequired ? "#ef4444" : "#71717a") : m.placement === "bullet_with_context" ? "#10b981" : m.placement === "projects_context" ? "#3b82f6" : "#f59e0b";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontWeight: 600, color: "#d4d4d8", fontSize: "0.9rem" }}>{m.keyword}</div>
            <div style={{ fontSize: "0.75rem", color: "#52525b", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 99 }}>{m.isRequired ? "Required" : "Nice"}</div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color, minWidth: 100, textAlign: "right" }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

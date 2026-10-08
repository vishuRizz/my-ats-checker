"use client";

import type { KeywordReport as KeywordReportType } from "@/types";

export function KeywordReport({ report }: { report: KeywordReportType }) {
  const { matched, missing, matchRate, requiredMatchRate, niceToHaveMatchRate, semanticMatches, semanticMatchRate } = report;

  const requiredMatched = matched.filter(m => m.isRequired);
  const niceMatched = matched.filter(m => !m.isRequired);
  const requiredMissing = missing.filter(m => m.isRequired);
  const niceMissing = missing.filter(m => !m.isRequired);
  const hasSemanticMatches = semanticMatches && semanticMatches.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: 20, textAlign: "center", position: "relative" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: matchRate >= 70 ? "var(--green)" : matchRate >= 40 ? "var(--amber)" : "var(--red)" }}>
            {matchRate}%
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Exact Match</div>
          {hasSemanticMatches && (
            <div style={{ fontSize: "0.75rem", color: "var(--amber)", marginTop: 4, fontWeight: 600 }}>
              + Semantic Match: {semanticMatchRate}%
            </div>
          )}
        </div>
        
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: requiredMatchRate >= 80 ? "var(--green)" : "var(--amber)" }}>
            {requiredMatchRate}%
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Required Skills Match</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
            {requiredMatched.length} of {requiredMatched.length + requiredMissing.length}
          </div>
        </div>

        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--blue)" }}>
            {niceToHaveMatchRate}%
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Nice-to-Have Match</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
            {niceMatched.length} of {niceMatched.length + niceMissing.length}
          </div>
        </div>
      </div>

      {hasSemanticMatches && (
        <div className="card" style={{ padding: 24, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--amber)", margin: 0 }}>
              🧠 Semantic Matches (AI-detected)
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} title="These terms mean the same thing but don't match exactly. Some ATS systems do exact match only — consider adding the exact term.">
              ℹ️
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {semanticMatches.map((m, i) => (
              <div key={`sem-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--amber)" }}>≈</span>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>"{m.jdKeyword}"</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>found as</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>"{m.resumeTerm}"</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>
                  {Math.round(m.similarity * 100)}% match
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Required Skills */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
            Required Skills
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {requiredMatched.map((m, i) => (
              <KeywordRow key={`rm-${i}`} keyword={m.keyword} matched={true} placement={m.placement} context={m.context} />
            ))}
            {requiredMissing.map((m, i) => (
              <KeywordRow key={`rmi-${i}`} keyword={m.keyword} matched={false} placement="missing" />
            ))}
            {requiredMatched.length === 0 && requiredMissing.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No required skills extracted.</p>
            )}
          </div>
        </div>

        {/* Nice to have */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
            Nice-to-Have Skills
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {niceMatched.map((m, i) => (
              <KeywordRow key={`nm-${i}`} keyword={m.keyword} matched={true} placement={m.placement} context={m.context} />
            ))}
            {niceMissing.map((m, i) => (
              <KeywordRow key={`nmi-${i}`} keyword={m.keyword} matched={false} placement="missing" />
            ))}
            {niceMatched.length === 0 && niceMissing.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No nice-to-have skills extracted.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function KeywordRow({ keyword, matched, placement, context }: { keyword: string, matched: boolean, placement: string, context?: string }) {
  return (
    <div style={{ 
      padding: 12, borderRadius: 8, 
      background: matched ? (placement === "bullet_with_context" ? "var(--green-dim)" : "var(--amber-dim)") : "var(--red-dim)",
      border: `1px solid ${matched ? (placement === "bullet_with_context" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)") : "rgba(239,68,68,0.3)"}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ 
          fontWeight: 600, 
          color: matched ? (placement === "bullet_with_context" ? "var(--green)" : "var(--amber)") : "var(--red)" 
        }}>
          {keyword}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: 99 }}>
          {matched ? (placement === "bullet_with_context" ? "Strong Context" : "Skills List Only") : "Missing"}
        </span>
      </div>
      {context && (
        <div style={{ 
          marginTop: 8, fontSize: "0.8rem", color: "var(--text-secondary)",
          borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: 8,
          fontStyle: "italic"
        }}>
          "...{context.trim()}..."
        </div>
      )}
    </div>
  );
}

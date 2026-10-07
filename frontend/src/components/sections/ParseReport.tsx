"use client";

import type { ParseResult } from "@/types";

export function ParseReport({ parseResult }: { parseResult: ParseResult }) {
  const { entities, sections, bestEffortText } = parseResult;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start" }}>
      {/* Left Column: Entities (Contact, Skills, etc) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            Extracted Entities
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <EntityRow label="Name" value={entities.name.value} conf={entities.name.confidence} />
            <EntityRow label="Email" value={entities.email.value} conf={entities.email.confidence} />
            <EntityRow label="Phone" value={entities.phone.value} conf={entities.phone.confidence} />
            
            <div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                Links ({entities.links.length})
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {entities.links.length > 0 ? (
                  entities.links.map((l, i) => (
                    <span key={i} style={{ fontSize: "0.85rem", color: "var(--blue)" }}>{l}</span>
                  ))
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>None detected</span>
                )}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
                Extracted Skills ({entities.skills.length})
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {entities.skills.length > 0 ? (
                  entities.skills.map((s, i) => (
                    <span key={i} style={{
                      padding: "2px 8px", background: "var(--bg-elevated)",
                      border: "1px solid var(--border)", borderRadius: 4,
                      fontSize: "0.75rem", color: "var(--text-primary)"
                    }}>
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>None detected in a skills section</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            Detected Sections
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sections.map((s, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 6
              }}>
                <div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                    {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
                  </span>
                  {s.rawHeading && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Found as "{s.rawHeading}"
                    </span>
                  )}
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700,
                  background: s.confidence >= 0.8 ? "var(--green-dim)" : "var(--amber-dim)",
                  color: s.confidence >= 0.8 ? "var(--green)" : "var(--amber)",
                }}>
                  {Math.round(s.confidence * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column: Full Text */}
      <div className="card" style={{ display: "flex", flexDirection: "column", height: "800px" }}>
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
            Raw Text (Reading Order)
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {bestEffortText.length} characters
          </span>
        </div>
        
        <div style={{
          padding: 24, overflowY: "auto", flex: 1,
          fontFamily: "var(--font-mono)", fontSize: "0.85rem",
          color: "var(--text-secondary)", whiteSpace: "pre-wrap",
          lineHeight: 1.6
        }}>
          {bestEffortText}
        </div>
      </div>
    </div>
  );
}

function EntityRow({ label, value, conf }: { label: string; value: string; conf: number }) {
  const color = conf >= 0.8 ? "var(--green)" : conf > 0 ? "var(--amber)" : "var(--red)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{label}</span>
        {conf > 0 && (
          <span style={{ fontSize: "0.75rem", color }}>{Math.round(conf * 100)}% conf</span>
        )}
      </div>
      <div style={{
        fontSize: "0.9rem", fontWeight: 500,
        color: value ? "var(--text-primary)" : "var(--red)",
      }}>
        {value || "Not found"}
      </div>
    </div>
  );
}

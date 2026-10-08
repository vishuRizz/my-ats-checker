"use client";

import { useState } from "react";
import type { ParseResult } from "@/types";
import dynamic from "next/dynamic";

// Dynamically import the heatmap so pdfjs only loads client-side
const PdfHeatmap = dynamic(
  () => import("./PdfHeatmap").then((m) => m.PdfHeatmap),
  { ssr: false, loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)", fontSize: "0.85rem" }}>
      Loading PDF viewer…
    </div>
  )}
);

interface ParseReportProps {
  parseResult: ParseResult;
  resumeFile?: File | null;
}

type ViewMode = "heatmap" | "text" | "split";

export function ParseReport({ parseResult, resumeFile }: ParseReportProps) {
  const { entities, sections, bestEffortText, readingOrderText, lostRegions, warnings } = parseResult;
  const { parsabilityRisk, parsabilityReason, textToPageRatio } = parseResult;
  const [viewMode, setViewMode] = useState<ViewMode>(resumeFile ? "split" : "text");
  const [showAtsOrder, setShowAtsOrder] = useState(false);

  const hasPdf = !!resumeFile && parseResult.fileType === "pdf";
  const lostCount = lostRegions.length;

  const riskConfig = parsabilityRisk === "high" ? {
    bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.35)", iconBg: "rgba(239,68,68,0.15)",
    icon: "🚨", label: "ATS Cannot Read This Resume", color: "#ef4444", badge: "HIGH RISK",
  } : parsabilityRisk === "medium" ? {
    bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.35)", iconBg: "rgba(245,158,11,0.15)",
    icon: "⚠️", label: "Low ATS Readability Detected", color: "#f59e0b", badge: "MEDIUM RISK",
  } : parsabilityRisk === "low" ? {
    bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.2)", iconBg: "rgba(99,102,241,0.1)",
    icon: "ℹ️", label: "Potential ATS Readability Issues", color: "#6366f1", badge: "LOW RISK",
  } : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ─── Parsability Risk Banner (Gap 3) ──────────────────────── */}
      {riskConfig && (
        <div style={{
          padding: "16px 20px", borderRadius: 12,
          background: riskConfig.bg, border: `1px solid ${riskConfig.border}`,
          display: "flex", gap: 16, alignItems: "flex-start",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: riskConfig.iconBg,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
          }}>
            {riskConfig.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <strong style={{ fontSize: "0.95rem", color: riskConfig.color }}>{riskConfig.label}</strong>
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
                background: riskConfig.color, color: "#fff",
                padding: "2px 7px", borderRadius: 99,
              }}>{riskConfig.badge}</span>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              {parsabilityReason}
            </p>
            {parsabilityRisk === "high" && (
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: 8,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: riskConfig.color }}>How to fix: </strong>
                  {parseResult.isImageOnly
                    ? "Open in Google Docs or Word and export as PDF. Never scan a printed resume. Avoid Canva's \"Image PDF\" export — use their ATS-friendly text export instead."
                    : "Try selecting all text in your PDF viewer. If you cannot select the text, ATS cannot read it. Re-create in Google Docs or Microsoft Word and export as PDF."}
                </p>
              </div>
            )}
            {textToPageRatio > 0 && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "8px 0 0", fontFamily: "monospace" }}>
                {textToPageRatio} text elements/page extracted
                {textToPageRatio < 60 ? " (expected 80–200+ for a standard resume)" : " ✓ normal density"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Warnings Banner ──────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div style={{
          padding: "12px 16px", borderRadius: 8,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <strong style={{ fontSize: "0.85rem", color: "var(--amber)" }}>⚠ Parser Warnings</strong>
          {warnings.map((w, i) => (
            <span key={i} style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {w.page ? `Page ${w.page}: ` : ""}{w.message}
            </span>
          ))}
        </div>
      )}

      {/* ─── Extracted Entities Strip ─────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
      }}>
        <EntityCard label="Name" value={entities.name.value} conf={entities.name.confidence} icon="👤" />
        <EntityCard label="Email" value={entities.email.value} conf={entities.email.confidence} icon="✉️" />
        <EntityCard label="Phone" value={entities.phone.value} conf={entities.phone.confidence} icon="📞" />
        <div className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: "1rem" }}>🔗</span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Links</span>
          </div>
          {entities.links.length > 0 ? (
            entities.links.map((l, i) => (
              <div key={i} style={{ fontSize: "0.82rem", color: "var(--blue)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>
            ))
          ) : (
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>None detected</span>
          )}
        </div>
      </div>

      {/* ─── Skills Strip ─────────────────────────────────────────── */}
      {entities.skills.length > 0 && (
        <div className="card" style={{ padding: "14px 16px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>
            Extracted Skills ({entities.skills.length})
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {entities.skills.map((s, i) => (
              <span key={i} style={{
                padding: "3px 10px", background: "var(--bg-elevated)",
                border: "1px solid var(--border)", borderRadius: 6,
                fontSize: "0.8rem", color: "var(--text-primary)",
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Sections Detected ────────────────────────────────────── */}
      <div className="card" style={{ padding: "14px 20px" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 12 }}>
          Detected Sections ({sections.length})
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {sections.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px",
              background: "var(--bg-elevated)", borderRadius: 8,
              border: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
              </span>
              {s.rawHeading && s.rawHeading.toLowerCase() !== s.name && (
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>"{s.rawHeading}"</span>
              )}
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                background: s.confidence >= 0.8 ? "var(--green-dim)" : "var(--amber-dim)",
                color: s.confidence >= 0.8 ? "var(--green)" : "var(--amber)",
              }}>
                {Math.round(s.confidence * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── View Mode Switcher ───────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {hasPdf && (
            <>
              <ViewButton active={viewMode === "split"} onClick={() => setViewMode("split")} label="⊞ Split View" />
              <ViewButton active={viewMode === "heatmap"} onClick={() => setViewMode("heatmap")} label="🔥 PDF Heatmap" />
            </>
          )}
          <ViewButton active={viewMode === "text"} onClick={() => setViewMode("text")} label="📄 Extracted Text" />
        </div>

        {lostCount > 0 && (
          <span style={{
            fontSize: "0.8rem", padding: "4px 12px", borderRadius: 99,
            background: "rgba(239,68,68,0.1)", color: "var(--red)",
            border: "1px solid rgba(239,68,68,0.2)", fontWeight: 600,
          }}>
            🔴 {lostCount} lost/at-risk region{lostCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ─── Split / Heatmap / Text ───────────────────────────────── */}
      {viewMode === "split" && hasPdf && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div className="card" style={{ padding: 16, overflowY: "auto", maxHeight: 800 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)",
            }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                PDF View with ATS Overlay
              </h3>
              {lostCount > 0 && (
                <span style={{ fontSize: "0.75rem", color: "var(--red)" }}>
                  {lostCount} flagged
                </span>
              )}
            </div>
            <PdfHeatmap file={resumeFile!} lostRegions={lostRegions} />
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden", maxHeight: 800, display: "flex", flexDirection: "column" }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                {showAtsOrder ? "ATS Reading Order" : "Best-Effort Order"}
              </h3>
              <button
                onClick={() => setShowAtsOrder((v) => !v)}
                style={{
                  fontSize: "0.75rem", padding: "3px 10px", borderRadius: 6,
                  background: showAtsOrder ? "rgba(239,68,68,0.1)" : "var(--bg-elevated)",
                  border: `1px solid ${showAtsOrder ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  color: showAtsOrder ? "var(--red)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {showAtsOrder ? "Show Clean Order" : "Show ATS Order"}
              </button>
            </div>
            <div style={{
              padding: 16, overflowY: "auto", flex: 1,
              fontFamily: "var(--font-mono)", fontSize: "0.8rem",
              color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7,
            }}>
              {showAtsOrder ? readingOrderText : bestEffortText}
            </div>
          </div>
        </div>
      )}

      {viewMode === "heatmap" && hasPdf && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
            PDF Heatmap — What the ATS Sees
          </h3>
          <PdfHeatmap file={resumeFile!} lostRegions={lostRegions} />
        </div>
      )}

      {viewMode === "text" && (
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{
            padding: "12px 20px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              {showAtsOrder ? "ATS Reading Order (naive)" : "Best-Effort Reading Order"}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {bestEffortText.length.toLocaleString()} chars
              </span>
              <button
                onClick={() => setShowAtsOrder((v) => !v)}
                style={{
                  fontSize: "0.75rem", padding: "3px 10px", borderRadius: 6,
                  background: showAtsOrder ? "rgba(239,68,68,0.1)" : "var(--bg-elevated)",
                  border: `1px solid ${showAtsOrder ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  color: showAtsOrder ? "var(--red)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {showAtsOrder ? "Clean Order" : "ATS Order"}
              </button>
            </div>
          </div>
          <div style={{
            padding: 20, maxHeight: 700, overflowY: "auto",
            fontFamily: "var(--font-mono)", fontSize: "0.85rem",
            color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7,
          }}>
            {showAtsOrder ? readingOrderText : bestEffortText}
          </div>
        </div>
      )}
    </div>
  );
}

function EntityCard({ label, value, conf, icon }: { label: string; value: string; conf: number; icon: string }) {
  const color = conf >= 0.8 ? "var(--green)" : conf > 0 ? "var(--amber)" : "var(--red)";
  const bg = conf >= 0.8 ? "var(--green-dim)" : conf > 0 ? "var(--amber-dim)" : "var(--red-dim)";
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        {conf > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: bg, color }}>
            {Math.round(conf * 100)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: value ? "var(--text-primary)" : "var(--red)" }}>
        {value || "Not found"}
      </div>
    </div>
  );
}

function ViewButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
        cursor: "pointer", transition: "all 0.15s",
        background: active ? "var(--indigo)" : "var(--bg-elevated)",
        color: active ? "white" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--indigo)" : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}

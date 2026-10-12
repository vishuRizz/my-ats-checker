"use client";

import { useState } from "react";
import type { AnalysisResponse } from "@/types";
import { exportPDF, exportDOCX } from "@/lib/exportReport";

interface ExportButtonProps {
  data: AnalysisResponse;
  filename: string;
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const [loading, setLoading] = useState<"pdf" | "docx" | null>(null);
  const [open, setOpen] = useState(false);

  const handle = async (format: "pdf" | "docx") => {
    setLoading(format);
    setOpen(false);
    try {
      if (format === "pdf") await exportPDF(data, filename);
      else await exportDOCX(data, filename);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Main button */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!!loading}
        id="export-report-button"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
          color: "white", fontWeight: 700, fontSize: "0.9rem",
          opacity: loading ? 0.7 : 1,
          boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
      >
        {loading ? (
          <>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
            Generating {loading.toUpperCase()}…
          </>
        ) : (
          <>
            ⬇ Export Report
            <span style={{
              fontSize: "0.7rem", background: "rgba(255,255,255,0.2)",
              padding: "2px 6px", borderRadius: 99,
            }}>
              PDF / DOCX
            </span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12, zIndex: 50, overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            minWidth: 220,
            animation: "fadeInUp 0.15s ease-out",
          }}>
            <div style={{ padding: "10px 16px 6px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Export full report as
              </p>
            </div>

            <ExportOption
              icon="📄"
              format="PDF"
              description="Styled, print-ready report"
              onClick={() => handle("pdf")}
            />
            <ExportOption
              icon="📝"
              format="DOCX"
              description="Editable Word document"
              onClick={() => handle("docx")}
            />

            <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Includes: entities, rules, score breakdown,
                {data.keywordReport ? " keyword match," : ""} and extracted text.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExportOption({ icon, format, description, onClick }: {
  icon: string; format: string; description: string; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", background: hover ? "var(--bg-elevated)" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
        transition: "background 0.15s",
      }}
      id={`export-${format.toLowerCase()}-button`}
    >
      <span style={{
        width: 36, height: 36, borderRadius: 8,
        background: hover ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.1rem", transition: "background 0.15s",
      }}>
        {icon}
      </span>
      <div>
        <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem", margin: 0 }}>
          {format}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: 0 }}>
          {description}
        </p>
      </div>
    </button>
  );
}

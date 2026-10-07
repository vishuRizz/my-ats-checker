"use client";

import { useEffect, useRef, useState } from "react";
import type { ParseResult, LostRegion } from "@/types";

interface PdfHeatmapProps {
  file: File;
  lostRegions: LostRegion[];
}

const REASON_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  text_in_header:   { fill: "rgba(239,68,68,0.22)",   stroke: "#ef4444", label: "Text in header (may be skipped)" },
  text_in_footer:   { fill: "rgba(239,68,68,0.22)",   stroke: "#ef4444", label: "Text in footer (may be skipped)" },
  image_only:       { fill: "rgba(239,68,68,0.35)",   stroke: "#ef4444", label: "Image-only (no text layer)" },
  table_scramble:   { fill: "rgba(245,158,11,0.25)",  stroke: "#f59e0b", label: "Table cell (may scramble)" },
  column_merge:     { fill: "rgba(245,158,11,0.25)",  stroke: "#f59e0b", label: "Multi-column merge risk" },
  multi_column:     { fill: "rgba(245,158,11,0.25)",  stroke: "#f59e0b", label: "Multi-column region" },
  icon_font:        { fill: "rgba(139,92,246,0.25)",  stroke: "#8b5cf6", label: "Icon font (text lost)" },
  ocr_low_conf:     { fill: "rgba(99,102,241,0.2)",   stroke: "#6366f1", label: "Low OCR confidence" },
};

export function PdfHeatmap({ file, lostRegions }: PdfHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        // Dynamically import pdfjs so it only loads in browser
        const pdfjsLib = await import("pdfjs-dist");
        // Use the legacy build which works in CJS/ESM mixed environments
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          // Wrapper for each page
          const pageWrapper = document.createElement("div");
          pageWrapper.style.cssText = `
            position: relative;
            margin-bottom: 16px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          `;

          // Canvas for PDF render
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = "display: block; width: 100%;";

          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) return;

          // Overlay SVG for lost regions
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
          svg.style.cssText = `
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
          `;

          // Filter lost regions for this page
          const pageRegions = lostRegions.filter((r) => r.page === pageNum);

          for (const region of pageRegions) {
            const colors = REASON_COLORS[region.reason] ?? {
              fill: "rgba(239,68,68,0.2)", stroke: "#ef4444", label: region.reason
            };

            // PDF coordinate system: y=0 is bottom; flip for canvas
            const scaleX = viewport.width / page.getViewport({ scale: 1 }).width;
            const scaleY = viewport.height / page.getViewport({ scale: 1 }).height;
            const pageHeight = page.getViewport({ scale: 1 }).height;

            const x = region.bbox.x0 * scaleX;
            const y = (pageHeight - region.bbox.y1) * scaleY;
            const w = (region.bbox.x1 - region.bbox.x0) * scaleX;
            const h = (region.bbox.y1 - region.bbox.y0) * scaleY;

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", String(x));
            rect.setAttribute("y", String(y));
            rect.setAttribute("width", String(w));
            rect.setAttribute("height", String(h));
            rect.setAttribute("fill", colors.fill);
            rect.setAttribute("stroke", colors.stroke);
            rect.setAttribute("stroke-width", "1.5");
            rect.setAttribute("rx", "2");
            rect.style.pointerEvents = "all";
            rect.style.cursor = "help";
            rect.style.transition = "fill 0.15s";

            // Hover tooltip via mouseover on SVG rect
            const tooltipText = `${colors.label}${region.text ? `: "${region.text.slice(0, 60)}${region.text.length > 60 ? "…" : ""}"` : ""}`;
            rect.dataset.tooltip = tooltipText;

            svg.appendChild(rect);
          }

          // Page label
          const label = document.createElement("div");
          label.textContent = `Page ${pageNum}`;
          label.style.cssText = `
            position: absolute; bottom: 8px; right: 12px;
            font-size: 11px; font-family: var(--font-mono, monospace);
            color: rgba(255,255,255,0.5);
            background: rgba(0,0,0,0.4);
            padding: 2px 8px; border-radius: 4px;
            pointer-events: none;
          `;

          pageWrapper.appendChild(canvas);
          pageWrapper.appendChild(svg);
          pageWrapper.appendChild(label);
          container.appendChild(pageWrapper);

          // Tooltip handling via event delegation on SVG
          svg.style.pointerEvents = "all";
          svg.addEventListener("mousemove", (e: MouseEvent) => {
            const target = e.target as SVGElement;
            if (target.dataset?.tooltip) {
              const rect = container.getBoundingClientRect();
              setTooltip({
                x: e.clientX - rect.left + 12,
                y: e.clientY - rect.top - 8,
                text: target.dataset.tooltip,
              });
            } else {
              setTooltip(null);
            }
          });
          svg.addEventListener("mouseleave", () => setTooltip(null));
        }

        if (!cancelled) setStatus("done");
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to render PDF");
          setStatus("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [file, lostRegions]);

  return (
    <div style={{ position: "relative" }}>
      {/* Legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12,
        padding: "10px 14px", background: "var(--bg-elevated)",
        borderRadius: 8, border: "1px solid var(--border)",
      }}>
        {[
          { color: "#ef4444", label: "Lost (header/footer/image)" },
          { color: "#f59e0b", label: "At risk (table/column)" },
          { color: "#8b5cf6", label: "Icon font" },
          { color: "#22c55e", label: "Clean (no overlay)" },
        ].map((item) => (
          <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: item.color, display: "inline-block", flexShrink: 0 }} />
            {item.label}
          </span>
        ))}
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 300, flexDirection: "column", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, border: "3px solid var(--border)",
            borderTop: "3px solid var(--indigo)", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Rendering PDF…</span>
        </div>
      )}

      {status === "error" && (
        <div style={{
          padding: 24, textAlign: "center", color: "var(--red)",
          background: "var(--red-dim)", borderRadius: 8, border: "1px solid var(--red)33",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
          <p style={{ fontSize: "0.9rem" }}>Could not render PDF preview: {error}</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>The text analysis above is still valid.</p>
        </div>
      )}

      {/* PDF pages render here */}
      <div
        ref={containerRef}
        style={{ position: "relative", display: status === "loading" ? "none" : "block" }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x,
          top: tooltip.y,
          background: "rgba(15,15,20,0.95)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: "0.8rem",
          color: "var(--text-primary)",
          maxWidth: 300,
          pointerEvents: "none",
          zIndex: 10,
          lineHeight: 1.4,
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, DragEvent } from "react";

interface UploadZoneProps {
  onAnalyze: (file: File, jd: string) => void;
  jdText: string;
  onJdChange: (text: string) => void;
}

export function UploadZone({ onAnalyze, jdText, onJdChange }: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [jdExpanded, setJdExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExts = [".pdf", ".docx"];
    const name = f.name.toLowerCase();
    const ok = allowedTypes.includes(f.type) || allowedExts.some((e) => name.endsWith(e));

    if (!ok) {
      alert("Only PDF and DOCX files are supported.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB.");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleSubmit = () => {
    if (file) onAnalyze(file, jdText);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 pb-20 animate-fade-in-up">
      {/* Drop Zone */}
      <div
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !file && fileInputRef.current?.click()}
        style={{
          padding: file ? "28px" : "60px 40px",
          cursor: file ? "default" : "pointer",
          textAlign: "center",
          marginBottom: 20,
          transition: "all 0.3s ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          id="resume-file-input"
        />

        {!file ? (
          <>
            <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">
              📄
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">
              Drop your resume here
            </h3>
            <p className="text-zinc-400 text-sm mb-6">
              or click to browse files
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {["PDF", "DOCX"].map((ext) => (
                <span key={ext} style={{
                  padding: "4px 12px", borderRadius: 99,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  fontSize: "0.78rem", color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}>
                  .{ext.toLowerCase()}
                </span>
              ))}
              <span style={{
                padding: "4px 12px", borderRadius: 99,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                fontSize: "0.78rem", color: "var(--text-muted)",
              }}>
                Max 5MB
              </span>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* File icon */}
            <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl shrink-0 text-white shadow-inner border border-zinc-700">
              {file.name.toLowerCase().endsWith(".pdf") ? "📄" : "📝"}
            </div>

            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, fontSize: "0.95rem" }}>
                {file.name}
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {formatSize(file.size)} · {file.name.split(".").pop()?.toUpperCase()}
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-muted)", cursor: "pointer",
                fontSize: "1.2rem", padding: "4px",
                transition: "color 0.2s",
              }}
              title="Remove file"
              aria-label="Remove file"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* JD Section */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 20,
        transition: "border-color 0.2s ease",
      }}>
        <button
          onClick={() => setJdExpanded((v) => !v)}
          style={{
            width: "100%", padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--text-primary)",
          }}
          id="jd-expand-button"
          aria-expanded={jdExpanded}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7,
              background: jdExpanded ? "#27272a" : "var(--bg-elevated)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem", transition: "background 0.2s",
            }}>
              🎯
            </span>
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              Add Job Description
            </span>
            <span style={{
              fontSize: "0.75rem", padding: "2px 10px",
              borderRadius: 99, fontWeight: 500,
              background: "rgba(245,158,11,0.1)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.2)",
            }}>
              Recommended
            </span>
          </div>
          <span style={{
            color: "var(--text-muted)", transition: "transform 0.2s",
            transform: jdExpanded ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}>▼</span>
        </button>

        {jdExpanded && (
          <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginBottom: 12, paddingTop: 12 }}>
              Paste the full job description. Results will include keyword match analysis and a JD-specific score.
            </p>
            <textarea
              id="jd-textarea"
              value={jdText}
              onChange={(e) => onJdChange(e.target.value)}
              maxLength={20_000}
              placeholder="Paste job description here...

We're looking for a Senior Software Engineer with 5+ years of experience in React, TypeScript, and Node.js. Required: experience with AWS, PostgreSQL, and CI/CD pipelines. Nice to have: GraphQL, Kubernetes..."
              style={{
                width: "100%", minHeight: 180,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 16px",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                fontFamily: "inherit",
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            />
            {jdText && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 8 }}>
                {jdText.split(/\s+/).filter(Boolean).length} words · {jdText.length.toLocaleString()} / 20,000 characters
              </p>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        className="w-full shimmer-btn bg-white text-zinc-950 hover:bg-zinc-200 rounded-full px-8 h-14 text-base font-medium shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        onClick={handleSubmit}
        disabled={!file}
        id="analyze-button"
      >
        {file ? `Analyze "${file.name.length > 30 ? file.name.slice(0, 28) + "…" : file.name}"` : "Upload a Resume to Analyze"}
      </button>

      <p style={{
        textAlign: "center", marginTop: 12,
        fontSize: "0.78rem", color: "var(--text-muted)",
      }}>
        🔒 No signup required. File is never stored. Auto-deleted after analysis.
      </p>
    </div>
  );
}

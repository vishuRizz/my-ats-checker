"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import { ArrowRight, FileText, CheckCircle2, ChevronDown, Sparkles, X } from "lucide-react";

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

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

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
      {/* Container Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed transition-all duration-300 text-center ${
            file
              ? "p-5 bg-slate-50/80 border-slate-200 cursor-default"
              : dragOver
              ? "p-10 sm:p-14 border-[#F26522] bg-orange-50/40 shadow-inner cursor-pointer"
              : "p-10 sm:p-14 border-slate-200/90 bg-[#FAFAFA] hover:border-[#F26522] hover:bg-orange-50/20 cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            id="resume-file-input"
          />

          {!file ? (
            <div>
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl mx-auto mb-5 text-[#051A24]">
                📄
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#051A24]">
                Drop your resume here
              </h3>
              <p className="text-[#273C46]/80 text-sm mb-6">
                or click to browse from your device
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["PDF", "DOCX"].map((ext) => (
                  <span
                    key={ext}
                    className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono font-medium text-slate-600 shadow-xs"
                  >
                    .{ext.toLowerCase()}
                  </span>
                ))}
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-xs">
                  Max 5MB
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 shadow-xs">
                  Zero Data Retention
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0 shadow-sm text-[#051A24]">
                {file.name.toLowerCase().endsWith(".pdf") ? "📄" : "📝"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#051A24] text-sm sm:text-base truncate">
                    {file.name}
                  </p>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatSize(file.size)} · {file.name.split(".").pop()?.toUpperCase()} Ready for Multi-ATS Audit
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-xs"
                title="Remove file"
                aria-label="Remove file"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Job Description Collapsible */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-[#FAFAFA] overflow-hidden transition-all">
          <button
            onClick={() => setJdExpanded((v) => !v)}
            className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/60 transition-colors"
            id="jd-expand-button"
            aria-expanded={jdExpanded}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm shadow-xs">
                🎯
              </div>
              <span className="font-semibold text-sm text-[#051A24]">
                Target Job Description
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[#F26522]">
                Recommended for Match Score
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`text-slate-500 transition-transform duration-300 ${
                jdExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {jdExpanded && (
            <div className="px-5 pb-5 pt-1 border-t border-slate-200/80 bg-white">
              <p className="text-xs text-[#273C46]/80 mb-3 pt-2 leading-relaxed">
                Paste the target job description to calculate exact keyword density match, missing skills, and tailored bullet point recommendations.
              </p>
              <textarea
                id="jd-textarea"
                value={jdText}
                onChange={(e) => onJdChange(e.target.value)}
                maxLength={20_000}
                placeholder="Paste the job posting requirements here... (e.g. Required skills: React, TypeScript, AWS, System Design...)"
                rows={6}
                className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl p-3.5 text-[#051A24] text-xs sm:text-sm leading-relaxed outline-none focus:border-[#051A24] focus:bg-white transition-all resize-y placeholder:text-slate-400 font-sans"
              />
              {jdText && (
                <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
                  <span>{jdText.split(/\s+/).filter(Boolean).length} words parsed</span>
                  <span>{jdText.length.toLocaleString()} / 20,000 characters</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!file}
          id="analyze-button"
          className={`w-full mt-6 py-4 px-6 rounded-full font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md ${
            file
              ? "bg-[#051A24] text-white hover:bg-[#0D212C] hover:shadow-xl cursor-pointer"
              : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
          }`}
        >
          {file ? (
            <>
              <Sparkles size={18} className="text-[#F26522]" />
              <span>
                Analyze &ldquo;{file.name.length > 28 ? file.name.slice(0, 26) + "…" : file.name}&rdquo;
              </span>
              <ArrowRight size={18} />
            </>
          ) : (
            <span>Upload a Resume to Begin Simulation</span>
          )}
        </button>

        {/* Security & Confidentiality Reassurance */}
        <p className="text-center text-xs text-slate-500 mt-4 leading-relaxed">
          🔒 100% confidential. Client-side verified. Document is auto-deleted immediately after analysis.
        </p>
      </div>
    </div>
  );
}

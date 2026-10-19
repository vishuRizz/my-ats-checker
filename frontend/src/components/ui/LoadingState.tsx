"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  status: "uploading" | "analyzing";
  progress?: number;
}

const STEPS = [
  { label: "Reading document hierarchy & font layers", icon: "📄" },
  { label: "Extracting raw text streams & structure", icon: "🔍" },
  { label: "Detecting contact headers & section blocks", icon: "📋" },
  { label: "Executing 10 multi-engine ATS layout rules", icon: "⚙️" },
  { label: "Benchmarking against Greenhouse, Ashby & Workday", icon: "🏢" },
  { label: "Matching skill density & generating score", icon: "📊" },
];

export function LoadingState({ status, progress = 0 }: LoadingStateProps) {
  const activeStep =
    status === "uploading"
      ? Math.floor((progress / 100) * 2)
      : Math.floor(Math.random() * 3) + 2;

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 py-12 animate-fade-in-up">
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.06)] max-w-lg w-full text-center">
        {/* Animated Icon Ring */}
        <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#F26522] border-r-[#051A24] animate-spin" />
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl shadow-xs">
            {status === "uploading" ? "⬆️" : "⚡"}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[#051A24] mb-2">
          {status === "uploading" ? "Uploading Resume…" : "Simulating Multi-ATS Parsers…"}
        </h2>
        <p className="text-sm text-[#273C46]/80 mb-8 max-w-sm mx-auto leading-relaxed">
          {status === "uploading"
            ? "Securely transferring your document into the parser sandbox"
            : "Running simulated tests across Greenhouse, Ashby, Workday, and Taleo algorithms"}
        </p>

        {/* Progress bar during upload */}
        {status === "uploading" && (
          <div className="w-full mb-8">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#051A24] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-slate-500 font-mono">
              <span>{progress}%</span>
              <span>Encrypted Sandbox</span>
            </div>
          </div>
        )}

        {/* Diagnostic Steps List */}
        <div className="flex flex-col gap-2.5 text-left mb-8">
          {STEPS.map((step, i) => {
            const isDone = i < (status === "uploading" ? 1 : activeStep);
            const isActive = i === (status === "uploading" ? 1 : activeStep);

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-300 ${
                  isActive
                    ? "bg-orange-50/60 border-orange-200 text-[#051A24] font-medium"
                    : isDone
                    ? "bg-slate-50/70 border-slate-100 text-slate-500"
                    : "bg-transparent border-transparent text-slate-400 opacity-60"
                }`}
              >
                <span className="text-base shrink-0">
                  {isDone ? "✅" : isActive ? step.icon : "○"}
                </span>
                <span className="flex-1 truncate">{step.label}</span>
                {isActive && (
                  <span className="text-[11px] font-semibold text-[#F26522] animate-pulse shrink-0">
                    Active…
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400">
          🔒 Encrypted in-memory processing. Document is auto-purged after generation.
        </p>
      </div>
    </div>
  );
}

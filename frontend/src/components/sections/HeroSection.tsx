"use client";

export function HeroSection() {
  return (
    <section className="pt-12 sm:pt-16 pb-8 px-6 text-center max-w-4xl mx-auto animate-fade-in-up">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold text-[#051A24] tracking-wide">
          Multi-Engine Parser Simulator · Zero Guesswork
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#051A24] leading-[1.12] mb-5">
        See what the ATS
        <br />
        <span className="font-mondwest italic text-[#051A24]/75">actually extracts.</span>
      </h1>

      {/* Subheadline */}
      <p className="text-base sm:text-lg text-[#273C46]/80 leading-relaxed max-w-2xl mx-auto mb-10">
        Upload your resume and get an instant parsing audit: raw text extraction, formatting hazards,
        multi-engine compatibility (Greenhouse, Workday, Ashby), and keyword alignment against your target job.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2.5 mb-8">
        {[
          { icon: "⚡", label: "Multi-ATS Engine Check" },
          { icon: "⚙️", label: "10 Structural Rules" },
          { icon: "🎯", label: "Keyword Gap Analysis" },
          { icon: "📊", label: "Deterministic Score" },
          { icon: "🔒", label: "Privacy-First · Client Safe" },
        ].map((f) => (
          <div
            key={f.label}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-xs font-medium text-[#273C46] shadow-sm hover:border-slate-300 transition-colors"
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Transparency Note */}
      <p className="text-xs text-[#273C46]/60 max-w-xl mx-auto leading-relaxed">
        ⚖️ No ATS uses a universal score. We reveal real parse output, keyword density, and formatting risks
        so you can bypass automated candidate filters with confidence.
      </p>
    </section>
  );
}

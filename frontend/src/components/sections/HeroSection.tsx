"use client";

export function HeroSection() {
  return (
    <section className="pt-20 pb-10 px-6 text-center max-w-4xl mx-auto animate-fade-in-up">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
        <span className="text-sm font-medium text-zinc-400">
          Transparent ATS analysis - no magic numbers
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6" style={{ fontFamily: "var(--font-cal-sans), sans-serif" }}>
        See what the <span className="text-zinc-500">ATS actually sees</span>
      </h1>

      {/* Subheadline */}
      <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-12">
        Upload your resume and get a full parse analysis: exactly what text was extracted,
        what was lost, formatting issues, and a keyword match against the job description.
      </p>

      {/* Feature pills */}
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginBottom: 16,
      }}>
        {[
          { icon: "📊", label: "Parse Report" },
          { icon: "⚙️", label: "10 Formatting Rules" },
          { icon: "🎯", label: "Keyword Match" },
          { icon: "📈", label: "Score Breakdown" },
          { icon: "🔒", label: "Privacy-first" },
        ].map((f) => (
          <div key={f.label} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 99,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            fontSize: "0.85rem", color: "var(--text-secondary)",
            fontWeight: 500,
          }}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Honesty note */}
      <p style={{
        fontSize: "0.78rem", color: "var(--text-muted)",
        maxWidth: 560, margin: "0 auto",
      }}>
        ⚖️ No ATS publishes a universal score. We show&nbsp;
        <em>parse analysis</em>, <em>match analysis</em>, and&nbsp;
        <em>estimated scores</em> - never claim to guarantee a pass.
      </p>
    </section>
  );
}

"use client";

export function HeroSection() {
  return (
    <section style={{
      padding: "80px 24px 40px",
      textAlign: "center",
      maxWidth: 900,
      margin: "0 auto",
      animation: "fadeInUp 0.7s ease-out",
    }}>
      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "6px 16px", borderRadius: 99,
        background: "rgba(99,102,241,0.1)",
        border: "1px solid rgba(99,102,241,0.25)",
        marginBottom: 28,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#10b981",
          display: "inline-block",
          animation: "pulse-glow 2s ease-in-out infinite",
        }} />
        <span style={{ fontSize: "0.83rem", color: "#a5b4fc", fontWeight: 500 }}>
          Transparent ATS analysis — no magic numbers
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: "clamp(2rem, 6vw, 3.8rem)",
        fontWeight: 900,
        lineHeight: 1.15,
        letterSpacing: "-0.03em",
        marginBottom: 20,
      }}>
        <span style={{ color: "var(--text-primary)" }}>See what the</span>{" "}
        <span style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          ATS actually sees
        </span>
      </h1>

      {/* Subheadline */}
      <p style={{
        fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
        color: "var(--text-secondary)",
        lineHeight: 1.7,
        maxWidth: 640,
        margin: "0 auto 48px",
      }}>
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
        <em>estimated scores</em> — never claim to guarantee a pass.
      </p>
    </section>
  );
}

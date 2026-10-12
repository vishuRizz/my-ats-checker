"use client";

interface LoadingStateProps {
  status: "uploading" | "analyzing";
  progress?: number;
}

const STEPS = [
  { label: "Reading file", icon: "📄" },
  { label: "Extracting text", icon: "🔍" },
  { label: "Detecting sections", icon: "📋" },
  { label: "Running rule engine", icon: "⚙️" },
  { label: "Matching keywords", icon: "🎯" },
  { label: "Computing score", icon: "📊" },
];

export function LoadingState({ status, progress = 0 }: LoadingStateProps) {
  const activeStep = status === "uploading"
    ? Math.floor((progress / 100) * 2)
    : Math.floor(Math.random() * 3) + 2;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "70vh", padding: "40px 20px",
    }}>
      {/* Animated orb */}
      <div style={{ position: "relative", marginBottom: 48 }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))",
          border: "1px solid rgba(99,102,241,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pulse-glow 2s ease-in-out infinite",
          fontSize: "2.5rem",
        }}>
          {status === "uploading" ? "⬆️" : "⚡"}
        </div>
        {/* Spinning ring */}
        <div style={{
          position: "absolute", inset: -8,
          borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "#6366f1",
          borderRightColor: "#8b5cf6",
          animation: "spin 1.5s linear infinite",
        }} />
      </div>

      <h2 style={{
        fontSize: "1.6rem", fontWeight: 700, marginBottom: 8,
        background: "linear-gradient(135deg, #f0f4ff, #a5b4fc)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        {status === "uploading" ? "Uploading Resume..." : "Analyzing Resume..."}
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: 40, fontSize: "0.95rem" }}>
        {status === "uploading"
          ? "Securely transferring your file"
          : "Running all 10 formatting rules and keyword analysis"}
      </p>

      {/* Progress bar */}
      {status === "uploading" && (
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 40 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 8, fontSize: "0.8rem", color: "var(--text-muted)"
          }}>
            <span>{progress}%</span>
            <span>Max 5MB</span>
          </div>
        </div>
      )}

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}>
        {STEPS.map((step, i) => {
          const isDone = i < (status === "uploading" ? 1 : activeStep);
          const isActive = i === (status === "uploading" ? 1 : activeStep);

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 16px",
              borderRadius: 10,
              background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
              border: `1px solid ${isActive ? "rgba(99,102,241,0.3)" : "transparent"}`,
              transition: "all 0.3s ease",
              opacity: isDone ? 0.5 : isActive ? 1 : 0.3,
            }}>
              <span style={{ fontSize: "1.1rem" }}>
                {isDone ? "✅" : isActive ? step.icon : "○"}
              </span>
              <span style={{
                fontSize: "0.9rem",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 400,
              }}>
                {step.label}
              </span>
              {isActive && (
                <span style={{
                  marginLeft: "auto", fontSize: "0.75rem",
                  color: "#6366f1", fontWeight: 500,
                  animation: "pulse-glow 1.5s ease-in-out infinite",
                }}>
                  Running...
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p style={{
        marginTop: 32, fontSize: "0.78rem", color: "var(--text-muted)",
        maxWidth: 380, textAlign: "center", lineHeight: 1.6,
      }}>
        🔒 Your resume is processed securely and never stored or used for training.
      </p>
    </div>
  );
}

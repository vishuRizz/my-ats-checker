"use client";

interface NavbarProps {
  onReset?: () => void;
}

export function Navbar({ onReset }: NavbarProps) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      borderBottom: "1px solid var(--border)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      background: "rgba(8,11,20,0.8)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 24px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem",
          }}>
            🔍
          </div>
          <span style={{
            fontSize: "1rem", fontWeight: 700,
            background: "linear-gradient(135deg, #f0f4ff, #a5b4fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            ATS Checker
          </span>
        </div>

        {/* Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: "0.75rem", fontWeight: 500,
            padding: "4px 12px", borderRadius: 99,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#818cf8",
          }}>
            Phase 1 MVP
          </span>

          {onReset && (
            <button
              onClick={onReset}
              className="btn-secondary"
              style={{ padding: "6px 16px", fontSize: "0.85rem" }}
            >
              ← New Scan
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

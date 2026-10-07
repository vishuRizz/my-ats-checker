"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({ score, size = 120, strokeWidth = 10 }: ScoreRingProps) {
  const [offset, setOffset] = useState(283); // 2 * pi * 45 (radius) = ~283

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    // Animate in
    const targetOffset = circumference - (score / 100) * circumference;
    // Small delay to allow CSS transitions to catch
    const timeout = setTimeout(() => setOffset(targetOffset), 100);
    return () => clearTimeout(timeout);
  }, [score, circumference]);

  // Determine color based on score
  const color =
    score >= 80 ? "#10b981" : // green
    score >= 60 ? "#f59e0b" : // amber
    "#ef4444"; // red

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
        />
        {/* Animated score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>

      {/* Center text */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontSize: size * 0.32,
          fontWeight: 800,
          color: "var(--text-primary)",
          lineHeight: 1,
        }}>
          {score}
        </span>
        <span style={{
          fontSize: size * 0.12,
          color: "var(--text-muted)",
          fontWeight: 600,
          marginTop: 2,
        }}>
          / 100
        </span>
      </div>
    </div>
  );
}

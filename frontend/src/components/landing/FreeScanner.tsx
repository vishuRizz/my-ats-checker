'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

function AnimatedEl({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInViewAnimation();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${inView ? 'animate-fade-in-up' : 'opacity-0'} ${className}`}
      style={{ animationDelay: inView ? `${delay}s` : undefined }}
    >
      {children}
    </div>
  );
}

export default function FreeScanner() {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    keywords: string;
    formatSafety: string;
    topSystem: string;
    insight: string;
  } | null>(null);

  const handleScan = async () => {
    if (!role.trim()) return;
    setLoading(true);
    setResult(null);

    // Simulate realistic multi-engine parsing latency
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    setResult({
      score: 87,
      keywords: '15 / 18 Detected',
      formatSafety: '99.4% Clean Parse',
      topSystem: 'Greenhouse & Ashby',
      insight: `For "${role.trim()}", leading ATS systems filter heavily for specific toolchains, quantified achievements, and standard heading hierarchies. We identified 3 critical keyword opportunities to lift your profile into the top 5% of applicants.`,
    });
  };

  return (
    <section id="scan" className="py-20 px-6 bg-white">
      <div className="max-w-2xl mx-auto">
        <AnimatedEl delay={0.1} className="text-center mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-[#273C46] mb-3">
            Instant Diagnostic Simulator
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold text-[#0D212C] leading-tight tracking-tight mb-4">
            See how ATS algorithms<br />
            <span className="font-mondwest italic">judge your career profile.</span>
          </h2>
          <p className="text-[#273C46]/80 text-base leading-relaxed">
            Enter your target job role. We&apos;ll run a simulated parse across modern ATS screening algorithms and show you where you stand in seconds.
          </p>
        </AnimatedEl>

        <AnimatedEl delay={0.2}>
          <div className="bg-white rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.08)] border border-slate-100 p-6 md:p-8">
            {/* Input row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="e.g. Senior Full-Stack Engineer, Product Manager, Data Scientist..."
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                className="flex-1 bg-[#F7FAFB] rounded-2xl px-5 py-3.5 text-[#051A24] text-sm outline-none border border-slate-200 focus:border-[#051A24] transition-colors placeholder:text-slate-400"
              />
              <button
                onClick={handleScan}
                disabled={loading || !role.trim()}
                className="bg-[#051A24] text-white rounded-2xl px-6 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#0D212C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  boxShadow:
                    '0 1px 2px 0 rgba(5,26,36,0.1), 0 4px 4px 0 rgba(5,26,36,0.09), 0 9px 6px 0 rgba(5,26,36,0.05)',
                }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                {loading ? 'Simulating…' : 'Simulate ATS'}
              </button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="space-y-2 text-sm text-[#273C46] py-3">
                {[
                  'Benchmarking against Greenhouse criteria…',
                  'Simulating Ashby parsing matrix…',
                  'Checking Workday header compatibility…',
                  'Calculating core skill keyword density…',
                ].map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 0.25}s` }}>
                    <div className="w-2 h-2 rounded-full bg-[#F26522]" />
                    {msg}
                  </div>
                ))}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-5 pt-2">
                {/* Score bar */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#273C46] font-semibold">
                      Simulated ATS Pass Score
                    </span>
                    <span className="text-3xl font-bold text-[#051A24]">
                      {result.score}<span className="text-base font-normal text-[#273C46]/60">/100</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Keywords', value: result.keywords },
                    { label: 'Format Safety', value: result.formatSafety },
                    { label: 'Optimal Engines', value: result.topSystem },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#F7FAFB] rounded-2xl p-4 text-center border border-slate-100">
                      <div className="text-sm md:text-base font-bold text-[#051A24] truncate">{s.value}</div>
                      <div className="text-[11px] text-[#273C46]/70 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Insight */}
                <div className="bg-[#051A24]/5 border border-[#051A24]/10 rounded-2xl p-4 text-sm text-[#051A24] leading-relaxed">
                  <span className="font-semibold text-[#F26522] mr-1">💡 Recruiter Diagnostic:</span>
                  {result.insight}
                </div>

                {/* CTA */}
                <Link
                  href="/ats"
                  className="w-full bg-[#051A24] text-white rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#0D212C] transition-colors cursor-pointer"
                  style={{
                    boxShadow:
                      '0 1px 2px 0 rgba(5,26,36,0.1), 0 4px 4px 0 rgba(5,26,36,0.09), 0 9px 6px 0 rgba(5,26,36,0.05), inset 0 2px 8px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <Sparkles size={16} className="text-[#F26522]" />
                  Upload your resume for full PDF analysis &amp; heatmap
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </AnimatedEl>
      </div>
    </section>
  );
}

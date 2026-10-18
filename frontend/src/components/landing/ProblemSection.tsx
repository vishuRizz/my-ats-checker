'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Sparkles, BarChart2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

/* ── Animated counter ─────────────────────────────────────── */
function CountUp({ end, suffix = '', duration = 1200 }: { end: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const { ref, inView } = useInViewAnimation();

  useEffect(() => {
    if (inView && !started.current) {
      started.current = true;
      const steps = 40;
      const stepTime = duration / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        setVal(Math.round(end * (step / steps)));
        if (step >= steps) clearInterval(timer);
      }, stepTime);
    }
  }, [inView, end, duration]);

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className="tabular-nums">
      {val.toLocaleString()}{suffix}
    </span>
  );
}

/* ── Bar chart for ATS engines ────────────────────────────── */
const BAR_DATA = [
  { h: 92, label: 'Greenhouse', active: true },
  { h: 95, label: 'Ashby', active: true },
  { h: 84, label: 'Workday', active: false },
  { h: 80, label: 'Taleo', active: false },
  { h: 91, label: 'Lever', active: true },
];

function AnimatedBars({ inView }: { inView: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setMounted(true), 300);
      return () => clearTimeout(t);
    }
  }, [inView]);

  return (
    <div className="flex items-end justify-between gap-3 h-32 pt-4 px-2">
      {BAR_DATA.map((bar, i) => (
        <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <span className="text-[10px] font-mono text-[#273C46]/60 font-semibold">{bar.h}%</span>
          <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
            <div
              className={`w-full rounded-t-lg transition-all duration-700 ${
                bar.active
                  ? 'bg-[#051A24]'
                  : 'bg-[#F26522]'
              }`}
              style={{
                height: mounted ? `${bar.h}%` : '0%',
                transitionDelay: `${i * 70}ms`,
              }}
            />
          </div>
          <span className="text-[9px] text-[#273C46]/60 font-medium truncate max-w-[54px]">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main section ─────────────────────────────────────────── */
export default function ProblemSection() {
  const { ref: sectionRef, inView } = useInViewAnimation();

  const insights = [
    {
      icon: <CheckCircle2 size={15} className="text-emerald-500" />,
      text: 'Header structure 100% compliant with Workday & Ashby',
      bg: 'bg-emerald-50',
    },
    {
      icon: <AlertCircle size={15} className="text-[#F26522]" />,
      text: 'Missing 4 high-priority keywords: Kubernetes, CI/CD, Go, Docker',
      bg: 'bg-orange-50',
      highlight: true,
    },
    {
      icon: <ShieldCheck size={15} className="text-indigo-500" />,
      text: 'Quantifiable metrics detected in 4 of 5 experience bullets',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <section className="py-24 px-6 bg-white" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-5xl mx-auto">

        {/* Badge */}
        <div
          className={`flex justify-center mb-8 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold tracking-widest text-[#051A24] uppercase shadow-sm">
            Intelligent Screening Diagnostics
          </span>
        </div>

        {/* Heading */}
        <div
          className={`text-center mb-5 transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h2 className="text-4xl md:text-5xl lg:text-[56px] font-semibold text-[#051A24] leading-[1.1] tracking-tight">
            Take Control Of Your
            <br />
            <span className="font-mondwest italic text-[#051A24]/70">ATS Match Rate</span>
          </h2>
        </div>

        {/* Sub */}
        <div
          className={`text-center mb-16 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <p className="text-[#273C46]/80 text-sm sm:text-[15px] max-w-md mx-auto leading-relaxed">
            Audit your resume against actual recruiter parsing models, expose missing competencies, and land more interview invites.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left card: Unified Metrics / bar chart */}
          <div
            className={`bg-[#FAFAFA] border border-slate-100 rounded-3xl p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all duration-700 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-mono text-[#273C46]/50 uppercase tracking-widest mb-1">ATS Match Score</p>
                <p className="text-3xl font-bold text-[#051A24] tracking-tight">
                  <CountUp end={89} duration={1000} />
                  <span className="text-base font-normal text-[#273C46]/50">/100</span>
                </p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                  <TrendingUp size={9} /> +24 pts after audit
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-[#273C46]/50 uppercase tracking-widest mb-1">Parsers Simulated</p>
                <p className="text-3xl font-bold text-[#051A24] tracking-tight">
                  <CountUp end={5} duration={800} />
                </p>
              </div>
            </div>

            {/* Bar chart */}
            <AnimatedBars inView={inView} />

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              <BarChart2 size={14} className="text-[#273C46]/40" />
              <p className="text-xs text-[#273C46]/60">Parsing fidelity simulated across standard recruitment engines</p>
            </div>
          </div>

          {/* Right card: AI Growth Insights */}
          <div
            className={`bg-[#FAFAFA] border border-slate-100 rounded-3xl p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all duration-700 delay-[400ms] ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            {/* Insight cards */}
            <div className="flex flex-col gap-3 mb-6">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border transition-all duration-500 ${
                    ins.highlight
                      ? 'bg-white border-orange-200 shadow-[0_2px_12px_rgba(242,101,34,0.08)]'
                      : 'bg-white/70 border-slate-100'
                  }`}
                  style={{
                    transitionDelay: inView ? `${500 + i * 100}ms` : '0ms',
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateX(0)' : 'translateX(16px)',
                  }}
                >
                  <div className={`w-7 h-7 rounded-xl ${ins.bg} flex items-center justify-center flex-shrink-0`}>
                    {ins.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#051A24] leading-snug">{ins.text}</span>
                  {ins.highlight && (
                    <div className="ml-auto relative flex-shrink-0">
                      {/* Sparkle burst */}
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-[#F26522] flex items-center justify-center shadow-[0_0_12px_rgba(242,101,34,0.4)]">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-orange-400 opacity-20 animate-ping" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer description */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-base font-semibold text-[#051A24] mb-1.5">Actionable Skill Gap Matrix</h3>
              <p className="text-xs text-[#273C46]/60 leading-relaxed">
                Pinpoint exact skills, metrics, and phrasing missing from your resume before you submit an application.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom stats strip */}
        <div
          className={`mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {[
            { stat: '75%', label: 'of resumes filtered out by ATS before human review' },
            { stat: '3.8×', label: 'higher interview callback rate with 85+ score' },
            { stat: '< 6s', label: 'average time a human screener reviews your resume' },
            { stat: '100%', label: 'confidential instant scan with zero credit card' },
          ].map((s) => (
            <div key={s.stat} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#051A24] mb-1">{s.stat}</div>
              <div className="text-xs text-[#273C46]/60 leading-relaxed">{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

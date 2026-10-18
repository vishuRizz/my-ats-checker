'use client';

import { ArrowRight, Check, X } from 'lucide-react';
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

const TIERS = [
  {
    name: 'Free Starter',
    price: '₹0',
    period: '/forever',
    features: [
      '3 full resume ATS scans / mo',
      'Greenhouse & Ashby simulation',
      'Core keyword density analysis',
      'Basic formatting safety check',
    ],
    highlight: false,
    cta: 'Start free',
    href: '/ats',
  },
  {
    name: 'Pro Jobseeker',
    price: '₹799',
    period: '/mo',
    features: [
      'Unlimited Multi-ATS scans',
      'All 5 engines: Workday, Taleo, Ashby, Lever, Greenhouse',
      'LinkedIn Profile Scanner & Headline AI',
      'Application Kit (Cover Letters + STAR Bullets)',
      'Job Application Kanban Tracker',
    ],
    highlight: true,
    cta: 'Get Pro Access',
    href: '/ats',
  },
  {
    name: 'Career Fast-Track',
    price: '₹2,499',
    period: '/year',
    features: [
      'Everything in Pro plan',
      'Chrome Extension sidecar access',
      'Deep AI Resume Rewriter & STAR Fixer',
      'Priority job matching & salary intelligence',
      'Interview callback confidence guarantee',
    ],
    highlight: false,
    cta: 'Get Annual Pass',
    href: '/ats',
  },
];

const COMPARISON = [
  { feature: 'Simulates 5 major ATS parsers (Workday, Ashby, Greenhouse...)', atsChecker: true, jobscan: false, generic: false },
  { feature: 'Interactive visual PDF parsing heatmap', atsChecker: true, jobscan: false, generic: false },
  { feature: 'Free instant scan with zero credit card', atsChecker: true, jobscan: false, generic: true },
  { feature: 'Integrated LinkedIn profile audit & score', atsChecker: true, jobscan: true, generic: false },
  { feature: 'Automated Application Kit with tailored cover letters', atsChecker: true, jobscan: false, generic: false },
  { feature: 'Built-in Kanban job application tracker', atsChecker: true, jobscan: false, generic: false },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <AnimatedEl delay={0.1} className="mb-14">
          <p className="text-xs font-mono uppercase tracking-widest text-[#273C46] mb-3">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-[#0D212C] leading-tight tracking-tight mb-4">
            Invest in interviews,{' '}
            <span className="font-mondwest italic">not endless rejections.</span>
          </h2>
          <p className="text-[#273C46]/80 text-base max-w-xl">
            Transparent, candidate-friendly pricing. Free scan forever. Upgrade only when you want to dominate recruiter algorithms.
          </p>
        </AnimatedEl>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {TIERS.map((tier, i) => (
            <AnimatedEl key={tier.name} delay={0.1 + i * 0.1}>
              <div
                className={`rounded-[32px] p-8 h-full flex flex-col ${
                  tier.highlight
                    ? 'bg-[#051A24] text-white shadow-xl'
                    : 'bg-[#F7FAFB] text-[#051A24] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                }`}
              >
                {tier.highlight && (
                  <span className="text-xs font-mono uppercase tracking-widest text-[#F26522] mb-4 inline-block font-bold">
                    ★ Most popular
                  </span>
                )}
                <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className={`text-sm mb-1 ${tier.highlight ? 'text-white/60' : 'text-[#273C46]/70'}`}>
                    {tier.period}
                  </span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm leading-snug">
                      <Check
                        size={16}
                        className={`flex-shrink-0 mt-0.5 ${
                          tier.highlight ? 'text-[#F26522]' : 'text-emerald-600'
                        }`}
                      />
                      <span className={tier.highlight ? 'text-white/90' : 'text-[#051A24]'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    tier.highlight
                      ? 'bg-[#F26522] text-white hover:bg-[#e05a1a]'
                      : 'bg-[#051A24] text-white hover:bg-[#0D212C]'
                  }`}
                  style={{
                    boxShadow: tier.highlight
                      ? '0 1px 2px 0 rgba(242,101,34,0.2), inset 0 2px 8px 0 rgba(255,255,255,0.3)'
                      : '0 1px 2px 0 rgba(5,26,36,0.1), 0 4px 4px 0 rgba(5,26,36,0.09)',
                  }}
                >
                  {tier.cta}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </AnimatedEl>
          ))}
        </div>

        {/* Comparison table */}
        <AnimatedEl delay={0.1}>
          <h3 className="text-2xl font-semibold text-[#0D212C] mb-6">
            Why choose ATS Checker over{' '}
            <span className="font-mondwest italic">legacy tools?</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3.5 pr-4 text-[#273C46] font-semibold">Capability</th>
                  <th className="py-3.5 px-4 text-[#051A24] font-bold text-center bg-slate-50/80 rounded-t-xl">ATS Checker</th>
                  <th className="py-3.5 px-4 text-[#273C46] font-medium text-center">Jobscan</th>
                  <th className="py-3.5 px-4 text-[#273C46] font-medium text-center">Generic Checkers</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3.5 pr-4 text-[#051A24] font-medium">{row.feature}</td>
                    <td className="py-3.5 px-4 text-center bg-slate-50/50">
                      {row.atsChecker ? (
                        <Check size={18} className="text-[#F26522] font-bold mx-auto" />
                      ) : (
                        <X size={16} className="text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.jobscan ? (
                        <Check size={16} className="text-slate-400 mx-auto" />
                      ) : (
                        <X size={16} className="text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.generic ? (
                        <Check size={16} className="text-slate-400 mx-auto" />
                      ) : (
                        <X size={16} className="text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedEl>
      </div>
    </section>
  );
}

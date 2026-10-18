'use client';

import Link from 'next/link';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

/* ── Link icon SVG ─────────────────────────────────────────── */
const LinkIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

/* ── Animated wrapper ──────────────────────────────────────── */
function AnimatedEl({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
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

/* ── Card 1: Candidate Case 1 ──────────────────────────────── */
function CaseCardOne() {
  return (
    <AnimatedEl delay={0.2}>
      <div>
        {/* Video container */}
        <Link href="/ats">
          <div
            className="relative rounded-2xl overflow-hidden bg-[#1a1d2e] group cursor-pointer"
            style={{ aspectRatio: '329/246' }}
          >
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260516_122702_390f5305-8719-41d5-ae80-d23ab3796c28.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-60"
            />

            {/* Candidate Score Overlay Graphic */}
            <div className="absolute inset-4 z-10 flex flex-col justify-center items-center pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/40 max-w-[280px] w-full text-center">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                  Match Score Optimization
                </span>
                <div className="flex items-center justify-center gap-3 my-2">
                  <span className="text-2xl font-bold text-red-500 line-through">41%</span>
                  <span className="text-lg text-slate-400">→</span>
                  <span className="text-3xl font-extrabold text-emerald-600">94%</span>
                </div>
                <span className="inline-block text-xs font-semibold text-slate-700 bg-slate-100 rounded-full px-3 py-1">
                  Ashby &amp; Greenhouse Passed
                </span>
              </div>
            </div>

            {/* Expanding hover button */}
            <div className="absolute bottom-4 left-4 z-20">
              <div className="relative flex items-center overflow-hidden rounded-full bg-white h-9 w-9 group-hover:w-[154px] transition-all duration-300 ease-in-out shadow-md">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 text-[13px] font-medium text-gray-900 whitespace-nowrap pl-4 pr-2">
                  Test your resume
                </span>
                <div className="absolute right-1.5 flex-shrink-0">
                  <LinkIcon className="-rotate-45 group-hover:rotate-0 transition-transform duration-300 text-gray-900" />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Text */}
        <p className="text-[13px] sm:text-[14px] text-gray-600 mt-4 leading-relaxed">
          Overcoming 70+ silent rejections by eliminating broken multi-column parsing traps and injecting missing cloud infrastructure competencies.
        </p>
        <p className="text-[14px] sm:text-[15px] font-semibold text-gray-900 mt-1">
          Staff Software Engineer · Landed 4 FAANG &amp; Unicorn Callbacks
        </p>
      </div>
    </AnimatedEl>
  );
}

/* ── Card 2: Candidate Case 2 ──────────────────────────────── */
function CaseCardTwo() {
  return (
    <AnimatedEl delay={0.3}>
      <div>
        {/* Video container */}
        <Link href="/linkedin">
          <div className="relative rounded-2xl overflow-hidden bg-[#242b35] group cursor-pointer aspect-square md:aspect-auto md:h-[300px] lg:h-[320px]">
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260516_123323_f909c2b8-ff6c-4edf-882b-8ebcdbe389b5.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-60"
            />

            {/* Overlay Graphic */}
            <div className="absolute inset-4 z-10 flex flex-col justify-center items-center pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/40 max-w-[280px] w-full text-center">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                  LinkedIn &amp; Recruiter Inbounds
                </span>
                <div className="flex items-center justify-center gap-2 my-2">
                  <span className="text-3xl font-extrabold text-[#F26522]">+340%</span>
                  <span className="text-xs font-medium text-slate-600">Search Appearances</span>
                </div>
                <span className="inline-block text-xs font-semibold text-slate-700 bg-slate-100 rounded-full px-3 py-1">
                  Top 1% Candidate Ranking
                </span>
              </div>
            </div>

            {/* Expanding hover button */}
            <div className="absolute bottom-4 left-4 z-20">
              <div className="relative flex items-center overflow-hidden rounded-full bg-gray-900 h-9 w-9 group-hover:w-[172px] transition-all duration-300 ease-in-out shadow-md">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 text-[13px] font-medium text-white whitespace-nowrap pl-4 pr-2">
                  Audit LinkedIn Profile
                </span>
                <div className="absolute right-1.5 flex-shrink-0">
                  <LinkIcon className="-rotate-45 group-hover:rotate-0 transition-transform duration-300 text-white" />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Text */}
        <p className="text-[13px] sm:text-[14px] text-gray-600 mt-4 leading-relaxed">
          Synchronized resume achievements with high-demand product metrics, elevating profile into recruiter search shortlists within 72 hours.
        </p>
        <p className="text-[14px] sm:text-[15px] font-semibold text-gray-900 mt-1">
          Senior Product Manager · Selected for Series B Head of Product Role
        </p>
      </div>
    </AnimatedEl>
  );
}

/* ── Section ───────────────────────────────────────────────── */
export default function CaseStudiesSection() {
  return (
    <section className="bg-white pt-16 sm:pt-20 lg:pt-28 pb-16 sm:pb-20 lg:pb-28">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Badge row */}
        <AnimatedEl delay={0.1} className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold text-[11px]">
            2
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-900">
            Real Candidate Transformations
          </span>
        </AnimatedEl>

        {/* Heading */}
        <AnimatedEl delay={0.15}>
          <h2
            className="font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 mb-10 sm:mb-14 lg:mb-16"
            style={{ fontSize: 'clamp(1.75rem, 5.5vw, 3.8rem)' }}
          >
            From the rejection pile to
            <br />
            multiple interview offers.
          </h2>
        </AnimatedEl>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <CaseCardOne />
          <CaseCardTwo />
        </div>
      </div>
    </section>
  );
}

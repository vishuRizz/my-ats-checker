'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

const EASE = 'cubic-bezier(0.25,0.1,0.25,1)';

const SMALL_IMG =
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80';
const LARGE_IMG =
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80';

function OrangeButton({ label, href = '#features' }: { label: string; href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 bg-[#F26522] hover:bg-[#e05a1a] text-white rounded-full pl-5 sm:pl-6 pr-2 py-2 text-[13px] sm:text-[14px] font-medium transition-colors duration-300 cursor-pointer"
    >
      <span className="overflow-hidden h-[18px] flex items-start">
        <span
          className="flex flex-col transition-transform duration-500 group-hover:-translate-y-1/2"
          style={{ transitionTimingFunction: EASE }}
        >
          <span className="leading-none h-[18px] flex items-center">{label}</span>
          <span className="leading-none h-[18px] flex items-center">{label}</span>
        </span>
      </span>
      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center flex-shrink-0">
        <ArrowRight
          size={14}
          className="transition-transform duration-500 group-hover:-rotate-45"
          style={{ transitionTimingFunction: EASE }}
        />
      </span>
    </Link>
  );
}

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

export default function AboutSection() {
  const PARA =
    "While you're obsessing over resume templates, automated ATS scanners strip headers, scramble columns, and dump your application. If your match score is under 80%, recruiters never see your profile.";

  return (
    <section className="bg-white pt-16 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-24 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Badge row */}
        <AnimatedEl delay={0.1} className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold text-[11px]">
            1
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-gray-200 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-900">
            The Parsing Reality
          </span>
        </AnimatedEl>

        {/* Heading */}
        <AnimatedEl delay={0.2}>
          <h2
            className="font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 mb-12 sm:mb-16 lg:mb-24"
            style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3.4rem)' }}
          >
            If algorithms can&apos;t parse your resume,
            <br />
            you don&apos;t exist.
          </h2>
        </AnimatedEl>

        {/* ── Mobile/Tablet layout ── */}
        <div className="lg:hidden">
          <AnimatedEl delay={0.3} className="mb-6">
            <p className="text-[15px] sm:text-[17px] leading-[1.6] font-medium text-gray-900 mb-6">
              {PARA}
            </p>
            <OrangeButton label="How scoring works" href="#how-it-works" />
          </AnimatedEl>

          <AnimatedEl delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 mt-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SMALL_IMG}
                alt="Candidate interview diagnostic"
                className="w-full sm:w-[45%] rounded-xl sm:rounded-2xl object-cover shadow-md"
                style={{ aspectRatio: '438/346' }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LARGE_IMG}
                alt="ATS Analytics Dashboard"
                className="w-full sm:w-[55%] rounded-xl sm:rounded-2xl object-cover shadow-md"
                style={{ aspectRatio: '900/600' }}
              />
            </div>
          </AnimatedEl>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden lg:grid grid-cols-[28%_1fr_46%] items-end gap-6 xl:gap-8">
          {/* Left: small image */}
          <AnimatedEl delay={0.3} className="self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SMALL_IMG}
              alt="Candidate career diagnostic"
              className="w-full rounded-2xl object-cover shadow-md"
              style={{ aspectRatio: '438/346' }}
            />
          </AnimatedEl>

          {/* Center: text + button */}
          <AnimatedEl delay={0.2} className="self-start flex justify-end">
            <div>
              <p className="text-[16px] sm:text-[18px] leading-[1.65] font-medium text-gray-900 mb-8">
                While you polish margins and fonts,
                <br />
                ATS filters read pure text streams.
                <br />
                If your skills don&apos;t match the parser matrix,
                <br />
                your application is discarded instantly.
              </p>
              <OrangeButton label="How scoring works" href="#how-it-works" />
            </div>
          </AnimatedEl>

          {/* Right: large image */}
          <AnimatedEl delay={0.4} className="self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LARGE_IMG}
              alt="ATS Analytics Dashboard"
              className="w-full rounded-2xl object-cover shadow-md"
              style={{ aspectRatio: '3/2' }}
            />
          </AnimatedEl>
        </div>
      </div>
    </section>
  );
}

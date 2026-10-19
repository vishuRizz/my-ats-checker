'use client';

import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const FOOTER_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4';

const NAV_LINKS = [
  { label: 'Resume ATS Scanner', href: '/ats' },
  { label: 'LinkedIn Profile Scanner', href: '/linkedin' },
  { label: 'Job Tracker & Pipeline', href: '/profile' },
  { label: 'Workflow & How It Works', href: '/#how-it-works' },
  { label: 'Pricing Plans', href: '/#pricing' },
];

const COMPANY_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact & Support', href: '/contact' },
  { label: 'Security & Architecture', href: '/security' },
  { label: 'Common Questions (FAQ)', href: '/#faq' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Security & Confidentiality', href: '/security' },
  { label: 'Data Erasure Request', href: '/contact' },
];

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
  { label: 'Twitter / X', href: 'https://x.com' },
];

export default function Footer() {
  return (
    <footer className="relative bg-black overflow-hidden">
      {/* ── Video background ── */}
      <video
        src={FOOTER_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-35"
      />

      {/* ── Gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      {/* ── Content ── */}
      <div className="relative z-10">

        {/* ─── CTA section ─── */}
        <div className="px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center max-w-4xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#F26522] mb-5 font-semibold">
            Get started free
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.08] tracking-tight mb-6"
          >
            Stop guessing recruiter
            <br />
            <span className="text-white/50 italic font-mondwest">
              algorithms today.
            </span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base mb-10 max-w-md mx-auto leading-relaxed">
            Free instant scan on upload. Zero credit card required.
            See your simulated ATS pass score in under 15 seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/ats"
              className="inline-flex items-center justify-center gap-2 bg-[#F26522] text-white rounded-full px-7 py-3.5 text-sm font-semibold hover:bg-[#e05a1a] transition-colors shadow-lg"
            >
              Scan your resume free
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white/90 hover:text-white hover:border-white/40 rounded-full px-7 py-3.5 text-sm font-medium transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>

        {/* ─── Divider ─── */}
        <div className="mx-6 md:mx-12 border-t border-white/10" />

        {/* ─── Footer links ─── */}
        <div className="px-6 md:px-12 py-14">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">

            {/* Brand col */}
            <div className="col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4 inline-flex">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-950 font-bold text-xs">
                  ✓
                </div>
                <span className="text-white font-bold text-base tracking-tight">
                  ATS<span className="text-[#F26522]">Checker</span>
                </span>
              </Link>
              <p className="text-white/50 text-sm leading-relaxed max-w-[280px] mb-5">
                Multi-engine ATS simulation and career optimizer for ambitious professionals.
                Transparent, deterministic scoring with zero data monetization.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Zero Data Retention Architecture</span>
              </div>
            </div>

            {/* Product links */}
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-[0.15em] font-mono mb-4 font-semibold">Product</p>
              <ul className="flex flex-col gap-3">
                {NAV_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-white/70 hover:text-white transition-colors text-sm"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company & Support links */}
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-[0.15em] font-mono mb-4 font-semibold">Company</p>
              <ul className="flex flex-col gap-3">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-white/70 hover:text-white transition-colors text-sm"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Connect */}
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-[0.15em] font-mono mb-4 font-semibold">Legal &amp; Trust</p>
              <ul className="flex flex-col gap-3">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-white/70 hover:text-white transition-colors text-sm"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-mono mb-3 font-semibold">Connect</p>
                <div className="flex flex-col gap-2">
                  {SOCIAL_LINKS.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-colors text-xs flex items-center gap-1.5"
                    >
                      <span>{l.label}</span>
                      <ArrowUpRight size={11} className="opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── Copyright bar ─── */}
        <div className="mx-6 md:mx-12 border-t border-white/10 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-white/35 text-xs">
            <span>© 2026 ATS Checker. All rights reserved.</span>
            
            <div className="flex flex-wrap items-center gap-5">
              <Link href="/privacy" className="hover:text-white/70 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white/70 transition-colors">
                Terms of Service
              </Link>
              <Link href="/security" className="hover:text-white/70 transition-colors">
                Security Architecture
              </Link>
              <Link href="/contact" className="hover:text-white/70 transition-colors">
                Contact Support
              </Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

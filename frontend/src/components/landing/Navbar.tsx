'use client';

import { useState } from 'react';
import { ArrowRight, Menu } from 'lucide-react';
import Link from 'next/link';

/* ─── Text-roll button ─────────────────────────────────────── */
export interface RollButtonProps {
  label: string;
  variant?: 'dark' | 'orange';
  size?: 'sm' | 'md';
  onClick?: () => void;
}

const EASE = 'cubic-bezier(0.25,0.1,0.25,1)';

export function RollButton({ label, variant = 'dark', size = 'md', onClick }: RollButtonProps) {
  const isDark = variant === 'dark';

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 rounded-full font-medium transition-colors duration-300 cursor-pointer ${
        isDark
          ? 'bg-gray-900 text-white pl-5 pr-2 py-2 hover:bg-gray-800'
          : 'bg-[#F26522] text-white hover:bg-[#e05a1a] pl-5 sm:pl-6 pr-2 py-2'
      } ${size === 'sm' ? 'text-[13px]' : 'text-[13px] sm:text-[14px]'}`}
    >
      {/* Animated text */}
      <span className="overflow-hidden h-[18px] flex items-start">
        <span
          className="flex flex-col transition-transform duration-500 group-hover:-translate-y-1/2"
          style={{ transitionTimingFunction: EASE }}
        >
          <span className="leading-none h-[18px] flex items-center">{label}</span>
          <span className="leading-none h-[18px] flex items-center">{label}</span>
        </span>
      </span>

      {/* Arrow circle */}
      <span
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-transform duration-500 flex-shrink-0 ${
          isDark ? 'bg-white text-gray-900' : 'bg-white text-[#F26522]'
        }`}
        style={{ transitionTimingFunction: EASE }}
      >
        <ArrowRight
          size={14}
          className="transition-transform duration-500 group-hover:-rotate-45"
          style={{ transitionTimingFunction: EASE }}
        />
      </span>
    </button>
  );
}

/* ─── Mobile menu ──────────────────────────────────────────── */
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="absolute inset-x-0 bottom-0 mx-3 mb-3 bg-white rounded-2xl p-6 transition-transform duration-500"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Nav links */}
        <nav className="flex flex-col gap-4 mb-8">
          {[
            ['Resume ATS', '/ats'],
            ['LinkedIn Scanner', '/linkedin'],
            ['Job Tracker', '/profile'],
            ['How It Works', '#how-it-works'],
            ['Pricing', '#pricing'],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="text-[24px] sm:text-[28px] font-medium text-gray-900 hover:text-[#F26522] transition-colors"
              onClick={onClose}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link href="/ats" onClick={onClose}>
          <RollButton label="Scan Resume Free" variant="dark" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Navbar ───────────────────────────────────────────────── */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="relative z-20 p-4 md:p-2 lg:p-3">
        <div className="max-w-[1440px] mx-auto bg-transparent md:bg-white md:rounded-full px-0 md:pl-5 md:pr-1 md:py-1">
          <div className="flex items-center justify-between h-11 sm:h-12">
            {/* Left */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  ✓
                </div>
                <span className="text-gray-900 font-bold text-[15px] tracking-tight hidden sm:block">
                  ATS<span className="text-[#F26522]">Checker</span>
                </span>
              </Link>

              {/* Nav links */}
              <div className="hidden md:flex items-center gap-6">
                {[
                  ['Resume ATS', '/ats'],
                  ['LinkedIn Scanner', '/linkedin'],
                  ['Job Tracker', '/profile'],
                  ['How It Works', '#how-it-works'],
                  ['Pricing', '#pricing'],
                ].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-[14px] font-medium text-gray-800 hover:text-black transition-colors duration-200"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-5">
              {/* Status text */}
              <span className="hidden lg:block text-[13px] text-gray-500 font-medium whitespace-nowrap">
                Multi-ATS Simulation · Free Scan
              </span>

              {/* CTA button */}
              <div className="hidden md:block">
                <Link href="/ats">
                  <RollButton label="Scan Resume Free" variant="dark" size="sm" />
                </Link>
              </div>

              {/* Mobile menu toggle */}
              <button
                className="md:hidden bg-gray-900 text-white rounded-full w-9 h-9 flex items-center justify-center cursor-pointer"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

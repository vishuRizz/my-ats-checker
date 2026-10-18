'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function BottomNav() {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-3 bg-white rounded-full pl-3 pr-3 py-2.5 sm:py-3 transition-transform hover:scale-[1.02]"
        style={{
          boxShadow:
            '0 0 0 1px rgba(0,0,0,0.06), 0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo mark */}
        <Link href="/ats" className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#051A24] flex items-center justify-center text-white text-xs font-bold shadow-sm">
            ✓
          </div>
          <span className="text-[#051A24] text-xs sm:text-sm font-semibold pr-1 whitespace-nowrap">
            Scan your resume free
          </span>
        </Link>

        {/* Arrow circle */}
        <Link
          href="/ats"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F26522] flex items-center justify-center hover:bg-[#e05a1a] transition-colors cursor-pointer flex-shrink-0"
          aria-label="Scan your resume free"
        >
          <ArrowRight size={14} className="text-white" />
        </Link>
      </div>
    </div>
  );
}

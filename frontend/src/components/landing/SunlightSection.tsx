'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204221_5339e40b-e73d-4ab0-9c65-79c18c66fd50.mp4';

export default function SunlightSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* ── Background video ── */}
      <video
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '70% center' }}
      />

      {/* ── Dark gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

      {/* ── Content ── */}
      <div
        className="relative z-10 flex flex-col justify-between h-full px-6 pb-12 pt-14 sm:pb-16 sm:pt-20 md:px-12 md:pb-20 md:pt-24 lg:px-16"
      >
        {/* Top: badge + heading */}
        <div className="max-w-3xl">
          {/* Badge */}
          <p
            className="text-xs sm:text-sm text-white/70 tracking-widest uppercase font-semibold mb-4 sm:mb-6"
            style={{ animation: 'fadeSlideUp 0.8s ease 0.2s both' }}
          >
            The 6-Second Glance
          </p>

          {/* Heading */}
          <h2
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight text-white"
            style={{ animation: 'fadeSlideUp 0.8s ease 0.4s both' }}
          >
            Most qualified resumes
            <br />
            sink beneath the surface,
            <br />
            <span className="text-white/50">unopened and unread.</span>
          </h2>
        </div>

        {/* Bottom: subtext + CTA */}
        <div>
          <p
            className="text-sm sm:text-base md:text-lg leading-relaxed text-white/70 max-w-sm sm:max-w-xl mb-6 sm:mb-8"
            style={{ animation: 'fadeSlideUp 0.8s ease 0.7s both' }}
          >
            While hundreds of applicants flood every open position, automated algorithms discard over 75% before a recruiter even glances at a page.
            <br className="hidden sm:block" />
            <span className="text-white font-medium"> ATS Checker elevates your profile to the top of the interview shortlist.</span>
          </p>

          {/* Stats row */}
          <div
            className="flex flex-wrap gap-8 sm:gap-12 mb-8 sm:mb-10"
            style={{ animation: 'fadeSlideUp 0.8s ease 0.85s both' }}
          >
            {[
              { stat: '75%', label: 'disqualified before human review' },
              { stat: '5 engines', label: 'simulated parsing algorithms' },
              { stat: '< 15 sec', label: 'to see your full audit score' },
            ].map(({ stat, label }) => (
              <div key={stat}>
                <div className="text-white text-xl sm:text-2xl font-bold">{stat}</div>
                <div className="text-white/50 text-xs sm:text-sm mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ animation: 'fadeSlideUp 0.8s ease 0.9s both' }}>
            <Link
              href="/ats"
              className="inline-flex items-center gap-2 rounded-full bg-[#F26522] px-6 py-3 text-sm font-semibold text-white hover:bg-[#e05a1a] transition-all hover:scale-105 shadow-lg"
            >
              Scan your resume free
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

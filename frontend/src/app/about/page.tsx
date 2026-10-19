import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import Footer from "@/components/landing/Footer";
import { Sparkles, ArrowRight, Target, Users, Zap, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | ATS Checker",
  description: "Learn why we built ATS Checker: bringing radical transparency to automated resume screening and candidate evaluation.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#051A24] font-sans relative clean-theme selection:bg-orange-100 selection:text-orange-950 flex flex-col justify-between">
      {/* ─── Ambient Glow Backdrop ─── */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-orange-100/35 via-slate-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ─── Header ─── */}
        <header className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
            <Target size={14} className="text-[#F26522]" />
            <span className="text-xs font-semibold text-[#051A24] tracking-wide">
              Our Mission · Transparency in Hiring
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#051A24] leading-[1.12] mb-5">
            Democratizing Candidate
            <br />
            <span className="font-mondwest italic text-[#051A24]/75">Screening Algorithms.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#273C46]/80 leading-relaxed max-w-2xl mx-auto">
            Hiring shouldn&apos;t be an opaque black hole. We reverse-engineered modern applicant tracking
            systems so talented jobseekers know exactly how their resumes parse before applying.
          </p>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-4xl mx-auto px-6 pb-28">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_4px_32px_rgba(0,0,0,0.04)] space-y-12">
            
            {/* Story Card */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#051A24]">
                The Problem We Set Out to Solve
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                Over 75% of job applications are filtered out by automated parsers before a human recruiter
                ever glances at the document. Qualified software engineers, product managers, and specialists
                are routinely discarded simply because an algorithm choked on a two-column layout, misread
                contact headers, or missed keyword synonyms.
              </p>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                Legacy resume checkers charge $400+/year, spam candidates with generic keyword stuffing tips,
                or sell user data to recruiter headhunters. We built ATS Checker to be the opposite: fast,
                transparent, deterministic, and privacy-respecting.
              </p>
            </div>

            {/* Principles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <Zap size={22} className="text-[#F26522] mb-3" />
                <h4 className="font-bold text-sm text-[#051A24] mb-1.5">Multi-Engine Simulation</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We don&apos;t just check generic rules. We benchmark documents against Greenhouse, Ashby, Workday, Taleo, and Lever parsing logic.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <ShieldCheck size={22} className="text-emerald-600 mb-3" />
                <h4 className="font-bold text-sm text-[#051A24] mb-1.5">Radical Transparency</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No arbitrary scores. We show you the exact raw extracted text stream and specific line-by-line formatting warnings.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <Users size={22} className="text-indigo-600 mb-3" />
                <h4 className="font-bold text-sm text-[#051A24] mb-1.5">Candidate-First Pricing</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generous free tier with zero credit card barrier. Affordable pro plans built for everyday jobseekers, not corporate enterprise HR.
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="p-8 rounded-2xl bg-[#051A24] text-white flex flex-wrap items-center justify-around gap-6 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#F26522]">12,000+</div>
                <div className="text-xs text-white/60 mt-1">Resumes Audited</div>
              </div>
              <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white">5 Engines</div>
                <div className="text-xs text-white/60 mt-1">Simulated Parsers</div>
              </div>
              <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">3.8×</div>
                <div className="text-xs text-white/60 mt-1">Average Callback Lift</div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="text-center pt-4">
              <h3 className="text-xl font-bold text-[#051A24] mb-3">
                Ready to see what the ATS sees?
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                Upload your resume now for a free, instant diagnostic scan in under 15 seconds.
              </p>
              <Link
                href="/ats"
                className="inline-flex items-center gap-2 bg-[#F26522] hover:bg-[#e05a1a] text-white font-semibold px-8 py-3.5 rounded-full shadow-lg transition-transform hover:scale-105"
              >
                <span>Scan Your Resume Free</span>
                <ArrowRight size={16} />
              </Link>
            </div>

          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

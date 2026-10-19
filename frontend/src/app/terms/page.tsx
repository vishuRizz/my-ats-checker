import type { Metadata } from "next";
import { Navbar } from "@/components/ui/Navbar";
import Footer from "@/components/landing/Footer";
import { FileCheck2, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | ATS Checker",
  description: "Terms and conditions governing the use of the ATS Checker resume and career platform.",
};

export default function TermsPage() {
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
            <Scale size={14} className="text-[#F26522]" />
            <span className="text-xs font-semibold text-[#051A24] tracking-wide">
              Legal Agreement · Updated October 2026
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#051A24] leading-[1.12] mb-5">
            Terms of Service
          </h1>

          <p className="text-base sm:text-lg text-[#273C46]/80 leading-relaxed max-w-2xl mx-auto">
            Please review these terms before using ATS Checker. We believe in transparent, straightforward
            agreements without hidden clauses.
          </p>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-4xl mx-auto px-6 pb-28">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_4px_32px_rgba(0,0,0,0.04)] space-y-10">
            
            {/* Quick Principles */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-4">
              <FileCheck2 size={24} className="text-[#F26522] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-[#051A24] mb-1">Honest Diagnostic Agreement</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  ATS Checker reverse-engineers parsing behaviors from top platforms (Greenhouse, Workday, Ashby).
                  While our diagnostics provide industry-leading fidelity, hiring decisions ultimately rest with human recruiters.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                1. Acceptance of Terms
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                By accessing, uploading documents to, or creating an account on ATS Checker, you agree
                to be bound by these Terms of Service. If you do not agree to all provisions, do not access
                the platform.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                2. Scope of Service
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                ATS Checker provides simulated applicant tracking system evaluations, PDF parsing heatmaps,
                keyword match reports, and tailored application assistance. Free tier accounts receive up
                to 3 scans monthly; Pro subscriptions include unlimited audits and advanced multi-engine testing.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                3. User Content &amp; Ownership
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                You retain complete, exclusive copyright and ownership over all resumes, cover letters, and career
                descriptions you submit. You grant ATS Checker only the temporary, ephemeral license required to
                extract text and return your diagnostic report.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                4. Realistic Disclaimers
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                No software tool can guarantee job interviews or hiring offers. Candidate selection depends on
                numerous external factors including recruiter preferences, company headcounts, and candidate
                pool competition. ATS Checker provides benchmarking tools, not employment guarantees.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                5. Subscription Billing &amp; Cancellations
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                Subscriptions renew on a monthly or annual cadence as chosen at checkout. You can cancel your
                subscription at any time through your Profile settings with zero friction. Cancellations take
                effect at the conclusion of the current billing cycle.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-xl font-bold text-[#051A24]">
                6. Contact &amp; Questions
              </h2>
              <p className="text-sm text-[#273C46]/80 leading-relaxed">
                For questions regarding our terms or commercial licensing, please contact:
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 inline-block text-sm text-slate-800 font-mono">
                legal@atschecker.ai
              </div>
            </section>

          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import { Navbar } from "@/components/ui/Navbar";
import Footer from "@/components/landing/Footer";
import { ShieldCheck, Lock, EyeOff, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | ATS Checker",
  description: "Learn how ATS Checker processes, protects, and auto-purges your resume and career data with zero retention.",
};

export default function PrivacyPage() {
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
            <ShieldCheck size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-[#051A24] tracking-wide">
              Privacy &amp; Data Transparency · Effective October 2026
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#051A24] leading-[1.12] mb-5">
            Privacy Policy
          </h1>

          <p className="text-base sm:text-lg text-[#273C46]/80 leading-relaxed max-w-2xl mx-auto">
            Your career documents are deeply personal. We built ATS Checker on a strict zero-data-retention
            architecture: your resumes are analyzed in-memory and immediately purged.
          </p>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-4xl mx-auto px-6 pb-28">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_4px_32px_rgba(0,0,0,0.04)] space-y-12">
            
            {/* Highlights row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8 border-b border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <Lock size={20} className="text-[#F26522] mb-2" />
                <h4 className="font-bold text-sm text-[#051A24] mb-1">Zero Retention</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Uploaded files are kept in volatile memory only during analysis, then permanently purged.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <EyeOff size={20} className="text-emerald-600 mb-2" />
                <h4 className="font-bold text-sm text-[#051A24] mb-1">Never Sold to Recruiters</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We never monetize candidate data or sell profiles to third-party headhunters or ad networks.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <FileText size={20} className="text-indigo-600 mb-2" />
                <h4 className="font-bold text-sm text-[#051A24] mb-1">No AI Training</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your resumes are never fed back into public foundation models for model retraining.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                1. Information We Collect
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                When you use ATS Checker, we process two categories of information:
              </p>
              <ul className="space-y-2 text-sm text-[#273C46]/80 list-disc pl-5">
                <li>
                  <strong className="text-[#051A24]">Document Data:</strong> The PDF or DOCX file you upload, including text streams, contact blocks, work experience, skill tokens, and optional target job descriptions.
                </li>
                <li>
                  <strong className="text-[#051A24]">Account Information (Optional):</strong> If you choose to sign in via Clerk, we store your email and verified user identifier to allow you to review past scan scores and maintain your job pipeline.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                2. How We Process Your Files
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                Our parsing pipeline runs in an isolated ephemeral sandbox. Text extraction algorithms
                (pdfjs and docx parsers) extract structured metadata to evaluate 10 formatting rules
                and match target keywords. The original binary file is discarded immediately upon
                generating the response payload.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                3. Security &amp; Storage Architecture
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                All network transmissions utilize TLS 1.3 encryption. For authenticated users who save scans,
                only diagnostic metrics (match percentage, detected keywords, and rule violation flags)
                are saved in our Neon Serverless PostgreSQL database. Your raw resume file is never retained.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                4. Third-Party Service Providers
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                We partner with vetted, enterprise-grade cloud infrastructure:
              </p>
              <ul className="space-y-2 text-sm text-[#273C46]/80 list-disc pl-5">
                <li><strong className="text-[#051A24]">Clerk:</strong> For identity verification and multi-factor authentication.</li>
                <li><strong className="text-[#051A24]">Neon DB:</strong> For encrypted database storage of user profile metadata.</li>
                <li><strong className="text-[#051A24]">Vercel:</strong> For edge computing and web application delivery.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                5. Your Rights &amp; Data Deletion
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                You retain full ownership of your data at all times. You have the right to request full erasure
                of your saved diagnostic history or account at any moment through your Profile dashboard or
                by contacting our support team.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-xl font-bold text-[#051A24]">
                6. Contact Our Data Protection Team
              </h2>
              <p className="text-sm text-[#273C46]/80 leading-relaxed">
                If you have questions regarding this Privacy Policy or wish to exercise your statutory rights,
                please reach out directly to:
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 inline-block text-sm text-slate-800 font-mono">
                privacy@atschecker.ai
              </div>
            </section>

          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

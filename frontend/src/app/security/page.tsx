import type { Metadata } from "next";
import { Navbar } from "@/components/ui/Navbar";
import Footer from "@/components/landing/Footer";
import { Shield, Lock, Server, Cpu, Database, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Security & Confidentiality | ATS Checker",
  description: "Learn about the security architecture, ephemeral sandbox, and encryption standards protecting your resumes on ATS Checker.",
};

export default function SecurityPage() {
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
            <Shield size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-[#051A24] tracking-wide">
              Security Architecture &amp; Trust Center
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#051A24] leading-[1.12] mb-5">
            Security &amp; Confidentiality
          </h1>

          <p className="text-base sm:text-lg text-[#273C46]/80 leading-relaxed max-w-2xl mx-auto">
            We treat your career history with enterprise confidentiality. Discover how our zero-retention
            pipeline guarantees your resume never leaks.
          </p>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-4xl mx-auto px-6 pb-28">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_4px_32px_rgba(0,0,0,0.04)] space-y-12">
            
            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-slate-100">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 mb-4 shadow-xs">
                  <Cpu size={20} />
                </div>
                <h3 className="font-bold text-base text-[#051A24] mb-2">Ephemeral In-Memory Sandbox</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Documents exist only in volatile server memory during extraction. Once parsed, buffers are zero-overwritten and garbage-collected. No disk storage.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#F26522] mb-4 shadow-xs">
                  <Lock size={20} />
                </div>
                <h3 className="font-bold text-base text-[#051A24] mb-2">TLS 1.3 Transport Encryption</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every byte transmitted between your browser and our API is encrypted with modern TLS 1.3 ciphers, preventing interception or packet snooping.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
                  <Database size={20} />
                </div>
                <h3 className="font-bold text-base text-[#051A24] mb-2">Isolated Metadata Storage</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Saved scan scores in Neon PostgreSQL are tied strictly to your Clerk cryptographic session token with strict row-level authorization.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                  <Server size={20} />
                </div>
                <h3 className="font-bold text-base text-[#051A24] mb-2">Zero AI Model Training</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  We maintain zero-retention data agreements with all LLM and embedding providers. Your candidate resume is never stored or used to train AI models.
                </p>
              </div>
            </div>

            {/* Compliance Section */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#051A24]">
                Vulnerability Disclosure &amp; Security Contact
              </h2>
              <p className="text-sm sm:text-base text-[#273C46]/80 leading-relaxed">
                We welcome responsible security research. If you believe you have discovered a vulnerability
                or potential security defect, please report it to our engineering security team:
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 inline-block text-sm text-slate-800 font-mono">
                security@atschecker.ai
              </div>
            </section>

          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

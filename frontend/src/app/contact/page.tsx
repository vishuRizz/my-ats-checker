"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import Footer from "@/components/landing/Footer";
import { Mail, MessageSquare, Send, CheckCircle2, HelpCircle } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.message.trim()) return;
    setSubmitted(true);
  };

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
            <MessageSquare size={14} className="text-[#F26522]" />
            <span className="text-xs font-semibold text-[#051A24] tracking-wide">
              Candidate Support &amp; Inquiries
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#051A24] leading-[1.12] mb-5">
            We&apos;re Here to Help You
            <br />
            <span className="font-mondwest italic text-[#051A24]/75">Land More Interviews.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#273C46]/80 leading-relaxed max-w-2xl mx-auto">
            Have a question about parser diagnostics, career suggestions, or custom plans?
            Reach out and our engineering support team will respond within 24 hours.
          </p>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-4xl mx-auto px-6 pb-28">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            
            {/* Left Col: Contact Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_32px_rgba(0,0,0,0.04)] space-y-6">
                <div>
                  <h3 className="font-bold text-base text-[#051A24] mb-1">Direct Channels</h3>
                  <p className="text-xs text-slate-500">Reach the team directly via email</p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 font-mono block mb-0.5 uppercase tracking-wider">Candidate Support</span>
                    <a href="mailto:support@atschecker.ai" className="font-semibold text-[#051A24] hover:text-[#F26522] transition-colors">
                      support@atschecker.ai
                    </a>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 font-mono block mb-0.5 uppercase tracking-wider">Privacy &amp; Security</span>
                    <a href="mailto:privacy@atschecker.ai" className="font-semibold text-[#051A24] hover:text-[#F26522] transition-colors">
                      privacy@atschecker.ai
                    </a>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 font-mono block mb-0.5 uppercase tracking-wider">Partnerships</span>
                    <a href="mailto:partners@atschecker.ai" className="font-semibold text-[#051A24] hover:text-[#F26522] transition-colors">
                      partners@atschecker.ai
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <HelpCircle size={14} className="text-[#F26522]" />
                    <span>Have common questions? Check our <Link href="/#faq" className="text-[#051A24] underline font-medium">FAQ</Link>.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Form Card */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-[0_4px_32px_rgba(0,0,0,0.04)]">
                {submitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-[#051A24]">Message Received</h3>
                    <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Thank you for reaching out! A member of our support team will get back to you at <strong>{formData.email}</strong> shortly.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: "", email: "", message: "" });
                      }}
                      className="inline-flex text-xs font-semibold px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-xl font-bold text-[#051A24] mb-2">Send us a message</h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Name</label>
                      <input
                        type="text"
                        placeholder="Alex Morgan"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#051A24] outline-none focus:border-[#051A24] focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="alex@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#051A24] outline-none focus:border-[#051A24] focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">How can we help? *</label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Describe your inquiry, parsing question, or feedback..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#051A24] outline-none focus:border-[#051A24] focus:bg-white transition-all placeholder:text-slate-400 resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#051A24] hover:bg-[#0D212C] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <Send size={15} />
                      <span>Send Inquiry</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

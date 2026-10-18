'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

const FAQS = [
  {
    q: "What is an ATS and why does it reject qualified candidates?",
    a: "Applicant Tracking Systems (like Greenhouse, Ashby, Workday, Taleo, and Lever) are automated software platforms used by employers to ingest, parse, rank, and filter job applicants. Over 75% of resumes are discarded before a human recruiter ever sees them due to unparsed headers, multi-column tables, or missing keyword thresholds.",
  },
  {
    q: "How is ATS Checker different from generic resume builders?",
    a: "Most resume builders sell decorative templates that actually break automated parsers. ATS Checker tests your real document against multi-engine parsing algorithms, gives you an interactive PDF parsing heatmap, diagnoses keyword density against live job descriptions, and syncs with LinkedIn recruiter search algorithms.",
  },
  {
    q: "Which ATS systems do you simulate?",
    a: "We benchmark your resume against the parsing criteria of Greenhouse, Ashby, Workday, Taleo, and Lever. You receive instant scores and actionable warnings for layout faults, missing contact fields, or misinterpreted dates.",
  },
  {
    q: "Will ATS Checker write tailored bullet points for my target role?",
    a: "Yes! Our Application Kit generator audits your resume against any job description, pinpoints missing competencies, and automatically drafts high-impact, quantified STAR bullet points that fit naturally without clumsy keyword stuffing.",
  },
  {
    q: "Can I optimize my LinkedIn profile here as well?",
    a: "Yes, our integrated LinkedIn Scanner audits your headline, about section, and skills list against recruiter search filters to rank your profile in the top 1% of candidate searches.",
  },
  {
    q: "Is my resume and personal career data kept secure?",
    a: "100% confidential. All documents and profile scans are encrypted in transit and at rest. We never sell your career information or distribute your resume to third parties.",
  },
];

function AnimatedEl({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
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

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <section id="faq" className="py-24 px-6 bg-[#FAFAFA]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-3xl mx-auto">
        <AnimatedEl delay={0.1} className="mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-[#273C46] mb-3">FAQ</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-[#0D212C] leading-tight tracking-tight">
            Common questions,{' '}
            <span className="font-mondwest italic">straight answers.</span>
          </h2>
        </AnimatedEl>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <AnimatedEl key={i} delay={0.1 + i * 0.05}>
              <div className="border border-slate-100 bg-white rounded-2xl overflow-hidden shadow-sm">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left text-[#051A24] font-medium text-sm md:text-base cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {faq.q}
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 ml-4 transition-transform duration-300 text-[#F26522] ${
                      open === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open === i && (
                  <div className="px-6 pb-5 text-sm text-[#273C46]/80 leading-relaxed border-t border-slate-50">
                    <div className="pt-4">{faq.a}</div>
                  </div>
                )}
              </div>
            </AnimatedEl>
          ))}
        </div>
      </div>
    </section>
  );
}

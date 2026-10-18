'use client';

import { useInViewAnimation } from '@/hooks/useInViewAnimation';

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

const STEPS = [
  {
    number: '01',
    title: 'Upload Resume & Job Description',
    description:
      'Drop your PDF/DOCX resume or paste your target job posting. Our parser instantly extracts career data, sections, and formatting structure.',
    icon: '📄',
  },
  {
    number: '02',
    title: 'Multi-Engine ATS Simulation',
    description:
      'We test your resume against real parsing engines used by Greenhouse, Ashby, Workday, Taleo, and Lever to catch hidden disqualifiers.',
    icon: '⚡',
  },
  {
    number: '03',
    title: 'Visual Heatmap & Skill Gap Matrix',
    description:
      'Pinpoint missing high-frequency keywords, identify unparsed sections, and evaluate quantifiable metric impact scores with surgical clarity.',
    icon: '🎯',
  },
  {
    number: '04',
    title: 'Generate Application Kit & Apply',
    description:
      'Export an ATS-compliant resume, tailored cover letter, and optimized STAR bullet points custom-built to land you the interview.',
    icon: '🚀',
  },
];

export default function HowItWorks() {
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Beat Applicant Tracking Systems with ATS Checker',
    description: 'A 4-step guide to auditing and optimizing your resume for modern ATS platforms.',
    step: STEPS.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  };

  return (
    <section id="how-it-works" className="py-20 px-6 bg-white max-w-5xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <AnimatedEl delay={0.1} className="mb-14">
        <p className="text-xs font-mono uppercase tracking-widest text-[#273C46] mb-3">Workflow</p>
        <h2 className="text-4xl md:text-5xl font-semibold text-[#0D212C] leading-tight tracking-tight">
          From raw draft to interview shortlist,{' '}
          <span className="font-mondwest italic">engineered for offers.</span>
        </h2>
      </AnimatedEl>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {STEPS.map((step, i) => (
          <AnimatedEl key={step.number} delay={0.1 + i * 0.1}>
            <div className="bg-[#F7FAFB] rounded-3xl p-8 h-full border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#051A24] flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#051A24] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#273C46]/80 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          </AnimatedEl>
        ))}
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

const TESTIMONIALS = [
  {
    quote:
      "I sent out 80 resumes with zero callbacks. Ran my PDF through ATS Checker and discovered Workday was failing to parse my skills section. Fixed the layout, reached a 94% score, and booked 3 tier-1 interviews within 10 days.",
    name: 'Marcus Anderson',
    role: 'Staff Software Engineer',
    company: 'Stripe Callback',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    quote:
      'The LinkedIn Scanner & ATS simulator showed me exactly why recruiters were passing on my profile. The keyword gap matrix and STAR bullet generator were the missing puzzle pieces.',
    name: 'Priya Sharma',
    role: 'Senior Product Manager',
    company: 'Atlassian Offer',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    quote:
      'Finally a modern career tool that feels like Linear and Perplexity instead of a clunky 2010 resume site. The visual PDF heatmap shows you precisely where the algorithm breaks.',
    name: 'David Zhang',
    role: 'Frontend Architect',
    company: 'Datadog Role',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    quote:
      "Before ATS Checker, I had zero clue that my 2-column layout was completely scrambling in Taleo and Greenhouse parsers. Re-exported an optimized single-column resume and callbacks surged.",
    name: 'Alex Wu',
    role: 'Cloud Solutions Lead',
    company: 'Series B Unicorn',
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    quote:
      "The Application Kit generated tailored bullet points and an executive summary that mirrored the job description without keyword stuffing. Landed an offer with a 35% salary bump.",
    name: 'Rachel Foster',
    role: 'Engineering Manager',
    company: 'Fintech Scaleup',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
];

const TRIPLED = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];

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

export default function TestimonialCarousel() {
  const [current, setCurrent] = useState(TESTIMONIALS.length); // start in middle set
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'ATS Checker',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: TESTIMONIALS.length.toString(),
    },
    review: TESTIMONIALS.map((t) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: t.name,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: '5',
        bestRating: '5',
      },
      reviewBody: t.quote,
    })),
  };

  const goTo = (index: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setCurrent(index);
    setTimeout(() => setTransitioning(false), 800);
  };

  const next = () => goTo(current + 1 >= TRIPLED.length ? TESTIMONIALS.length : current + 1);
  const prev = () => goTo(current - 1 < 0 ? TESTIMONIALS.length * 2 - 1 : current - 1);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, 3800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  });

  const visibleIdx = current % TESTIMONIALS.length;
  const t = TESTIMONIALS[visibleIdx];

  return (
    <section className="py-20 px-6 bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <AnimatedEl delay={0.1} className="flex items-start justify-between mb-12">
          <h2 className="text-4xl md:text-5xl font-semibold text-[#0D212C] leading-tight tracking-tight">
            What candidates{' '}
            <span className="font-mondwest italic">say</span>
          </h2>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className="fill-[#F26522] text-[#F26522]" />
              ))}
            </div>
            <span className="text-xs text-[#273C46] font-semibold">4.9/5 by 12,000+ jobseekers</span>
          </div>
        </AnimatedEl>

        {/* Card */}
        <AnimatedEl delay={0.2}>
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="bg-white rounded-[32px] md:rounded-[40px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 px-8 md:px-14 py-10 transition-all duration-700"
              style={{
                opacity: transitioning ? 0.4 : 1,
                transform: transitioning ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {/* Quote mark */}
              <svg width="32" height="24" viewBox="0 0 32 24" fill="none" className="mb-6 opacity-25">
                <path
                  d="M0 24V14.4C0 10.4 1.06667 7.06667 3.2 4.4C5.42667 1.73333 8.53333 0.266667 12.5333 0L13.8667 2.66667C11.4667 3.06667 9.6 4 8.26667 5.46667C6.93333 6.84 6.26667 8.53333 6.26667 10.5333H12.5333V24H0ZM18.6667 24V14.4C18.6667 10.4 19.7333 7.06667 21.8667 4.4C24.0933 1.73333 27.2 0.266667 31.2 0L32.5333 2.66667C30.1333 3.06667 28.2667 4 26.9333 5.46667C25.6 6.84 24.9333 8.53333 24.9333 10.5333H31.2V24H18.6667Z"
                  fill="#051A24"
                />
              </svg>

              <p className="text-lg md:text-xl text-[#0D212C] leading-relaxed mb-8 max-w-2xl">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <p className="font-semibold text-sm text-[#051A24]">{t.name}</p>
                    <p className="text-xs text-[#273C46]/80 font-medium">
                      → {t.role}, {t.company}
                    </p>
                  </div>
                </div>

                {/* Nav buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={prev}
                    aria-label="Previous testimonial"
                    className="w-11 h-11 rounded-full border border-[#0D212C]/20 flex items-center justify-center text-[#051A24] hover:bg-[#051A24] hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next testimonial"
                    className="w-11 h-11 rounded-full border border-[#0D212C]/20 flex items-center justify-center text-[#051A24] hover:bg-[#051A24] hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i + TESTIMONIALS.length)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === visibleIdx ? 'bg-[#051A24] w-5' : 'bg-[#051A24]/20 w-1.5'
                  }`}
                />
              ))}
            </div>
          </div>
        </AnimatedEl>
      </div>
    </section>
  );
}

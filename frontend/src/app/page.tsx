import type { Metadata } from 'next';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import ProblemSection from '@/components/landing/ProblemSection';
import CaseStudiesSection from '@/components/landing/CaseStudiesSection';
import FreeScanner from '@/components/landing/FreeScanner';
import HowItWorks from '@/components/landing/HowItWorks';
import PricingSection from '@/components/landing/PricingSection';
import TestimonialCarousel from '@/components/landing/TestimonialCarousel';
import FAQ from '@/components/landing/FAQ';
import SunlightSection from '@/components/landing/SunlightSection';
import Footer from '@/components/landing/Footer';
import BottomNav from '@/components/landing/BottomNav';

export const metadata: Metadata = {
  title: 'ATS Checker | Enterprise-Grade AI Resume & LinkedIn Scanner',
  description:
    'Simulate real recruiter algorithms. Check your resume compatibility against Greenhouse, Ashby, Workday, Taleo, and Lever in under 15 seconds.',
  keywords: [
    'ATS Checker',
    'Resume Scanner',
    'Applicant Tracking System',
    'Greenhouse parser',
    'Workday resume checker',
    'Ashby ATS',
    'LinkedIn optimizer',
    'Job application tracker',
  ],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'ATS Checker',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'ATS Checker simulates enterprise applicant tracking system algorithms to identify formatting errors, keyword gaps, and match scores.',
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'INR',
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 1. Hero: dynamic shader background */}
      <HeroSection />

      {/* 2. About: algorithm reality */}
      <AboutSection />

      {/* 2.5 Unique Features & live diagnostics */}
      <ProblemSection />

      {/* 3. Real candidate breakthroughs */}
      <CaseStudiesSection />

      {/* 4–8. Interactive product sections */}
      <div className="page-sections">
        <FreeScanner />
        <HowItWorks />
        <TestimonialCarousel />
        <PricingSection />
        <FAQ />
      </div>

      {/* 9. Cinematic visual section */}
      <SunlightSection />

      {/* 10. Footer with video background */}
      <Footer />

      {/* Fixed floating bottom pill nav */}
      <BottomNav />
    </>
  );
}

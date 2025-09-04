'use client';

import RecaptchaProvider from '@/components/RecaptchaProvider';
import LinkioHeader from '@/components/LinkioHeader';
import HeroSection from '@/components/homepage/HeroSection';
import ProblemSection from '@/components/homepage/ProblemSection';
import SolutionSection from '@/components/homepage/SolutionSection';
import ProofSection from '@/components/homepage/ProofSection';
import WhyNowSection from '@/components/homepage/WhyNowSection';
import PricingSection from '@/components/homepage/PricingSection';
import DemoSection from '@/components/homepage/DemoSection';
import FAQSection from '@/components/homepage/FAQSection';
import MarketingFooter from '@/components/MarketingFooter';

export default function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-white">
      <RecaptchaProvider />
      <LinkioHeader variant="default" />
      
      {/* Section 1: Hero */}
      <HeroSection />
      
      {/* Section 2: Problem Agitation */}
      <ProblemSection />
      
      {/* Section 3: Our Solution */}
      <SolutionSection />
      
      {/* Section 4: Proof/Results */}
      <ProofSection />
      
      {/* Section 5: Why Now + CTA */}
      <WhyNowSection />
      
      {/* Section 6: Pricing */}
      <PricingSection />
      
      {/* Section 7: Interactive Demo */}
      <DemoSection />
      
      {/* Section 8: FAQ */}
      <FAQSection />
      
      <MarketingFooter />
    </div>
  );
}
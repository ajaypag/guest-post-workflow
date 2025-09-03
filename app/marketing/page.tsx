'use client';

import RecaptchaProvider from '@/components/RecaptchaProvider';
import LinkioHeader from '@/components/LinkioHeader';
import HeroSection from '@/components/homepage/HeroSection';
import ProblemSection from '@/components/homepage/ProblemSection';
import MechanismSection from '@/components/homepage/MechanismSection';
import ProofSection from '@/components/homepage/ProofSection';
import HowItWorksSection from '@/components/homepage/HowItWorksSection';
import WhyNowSection from '@/components/homepage/WhyNowSection';
import PricingSection from '@/components/homepage/PricingSection';
import DemoSection from '@/components/homepage/DemoSection';
import FAQSection from '@/components/homepage/FAQSection';
import FinalCTASection from '@/components/homepage/FinalCTASection';
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
      
      {/* Section 3: The Mechanism */}
      <MechanismSection />
      
      {/* Section 4: Proof/Results */}
      <ProofSection />
      
      {/* Section 5: How It Works */}
      <HowItWorksSection />
      
      {/* Section 6: Why Now */}
      <WhyNowSection />
      
      {/* Section 7: Pricing */}
      <PricingSection />
      
      {/* Section 8: Interactive Demo */}
      <DemoSection />
      
      {/* Section 9: FAQ */}
      <FAQSection />
      
      {/* Section 10: Final CTA */}
      <FinalCTASection />
      
      <MarketingFooter />
    </div>
  );
}
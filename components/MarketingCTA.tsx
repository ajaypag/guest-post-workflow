'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface MarketingCTAProps {
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  variant?: 'default' | 'compact';
}

/**
 * MarketingCTA - Reusable CTA section for marketing pages
 * 
 * Features a gradient background with proper contrast for buttons and text.
 * Includes primary (white) and secondary (outlined) CTAs.
 * 
 * Usage:
 * <MarketingCTA /> - Uses default text and links
 * <MarketingCTA title="Custom Title" primaryButtonText="Get Started" />
 */
export default function MarketingCTA({
  title = "Ready for Strategic Link Building?",
  description = "Join dozens of agencies, SEO teams, and business owners getting quality links at wholesale pricing.",
  primaryButtonText = "Start Your Campaign",
  primaryButtonHref = "/login",
  secondaryButtonText = "Browse Our Database",
  secondaryButtonHref = "/guest-posting-sites",
  variant = 'default'
}: MarketingCTAProps) {
  return (
    <section className={`${variant === 'compact' ? 'py-12' : 'py-20'} bg-gradient-to-br from-blue-600 to-purple-700 text-white cta-gradient`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className={`${variant === 'compact' ? 'text-3xl' : 'text-4xl'} font-bold mb-6 text-white`}>
          {title}
        </h2>
        <p className={`${variant === 'compact' ? 'text-lg' : 'text-xl'} mb-8 text-blue-100`}>
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={primaryButtonHref}
            className="cta-button-primary inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold rounded-lg transition-colors text-lg"
          >
            {primaryButtonText}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href={secondaryButtonHref}
            className="cta-button-secondary inline-flex items-center justify-center gap-2 px-8 py-4 border-2 font-semibold rounded-lg transition-colors text-lg"
          >
            {secondaryButtonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
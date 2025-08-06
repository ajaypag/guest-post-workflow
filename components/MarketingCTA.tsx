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
  primaryButtonHref = "/signup/marketing",
  secondaryButtonText = "Browse Our Database",
  secondaryButtonHref = "/guest-posting-sites",
  variant = 'default'
}: MarketingCTAProps) {
  return (
    <section className={`${variant === 'compact' ? 'py-12' : 'py-20'} bg-gradient-to-br from-blue-600 to-purple-700 text-white`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className={`${variant === 'compact' ? 'text-3xl' : 'text-4xl'} font-bold mb-6`}>
          {title}
        </h2>
        <p className={`${variant === 'compact' ? 'text-lg' : 'text-xl'} opacity-90 mb-8`}>
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={primaryButtonHref}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-lg"
            style={{ 
              backgroundColor: '#ffffff', 
              color: '#2563eb' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#2563eb';
            }}
          >
            {primaryButtonText}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href={secondaryButtonHref}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors text-lg"
            style={{ 
              borderColor: '#ffffff',
              color: '#ffffff',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            {secondaryButtonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
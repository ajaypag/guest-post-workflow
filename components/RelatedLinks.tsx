import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface RelatedLink {
  href: string;
  title: string;
  description?: string;
}

interface RelatedLinksProps {
  links: RelatedLink[];
  title?: string;
  variant?: 'inline' | 'sidebar' | 'footer';
}

export function RelatedLinks({ 
  links, 
  title = "Related Articles", 
  variant = 'sidebar' 
}: RelatedLinksProps) {
  if (variant === 'inline') {
    return (
      <div className="my-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-2 text-blue-600 hover:text-blue-800 transition-colors group"
            >
              <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              <div>
                <span className="font-medium">{link.title}</span>
                {link.description && (
                  <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group"
            >
              <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
                {link.title}
              </h4>
              {link.description && (
                <p className="text-sm text-gray-600">{link.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Default sidebar variant
  return (
    <aside className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <nav className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {link.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

// Predefined link collections for common topics
export const linkBuildingLinks: RelatedLink[] = [
  { href: '/best-link-building-services', title: 'Best Link Building Services' },
  { href: '/link-building-costs', title: 'Link Building Costs Guide' },
  { href: '/how-to-get-high-authority-backlinks', title: 'Get High Authority Backlinks' },
  { href: '/broken-link-building-guide', title: 'Broken Link Building Guide' },
  { href: '/edu-link-building-guide', title: 'EDU Link Building Strategy' },
  { href: '/local-business-link-building', title: 'Local Business Link Building' },
];

export const guestPostingLinks: RelatedLink[] = [
  { href: '/best-guest-posting-services', title: 'Best Guest Posting Services' },
  { href: '/guest-posting-sites', title: 'Guest Posting Sites List' },
  { href: '/best-blogger-outreach-services', title: 'Blogger Outreach Services' },
  { href: '/email-outreach-templates', title: 'Email Outreach Templates' },
  { href: '/follow-up-email', title: 'Follow-Up Email Templates' },
];

export const seoToolsLinks: RelatedLink[] = [
  { href: '/best-content-seo-tools', title: 'Best Content SEO Tools' },
  { href: '/best-rank-tracking-tools-local-businesses', title: 'Rank Tracking Tools' },
  { href: '/best-email-finders', title: 'Best Email Finder Tools' },
  { href: '/anchor-text-optimizer', title: 'Anchor Text Optimizer' },
];

export const industrySpecificLinks: RelatedLink[] = [
  { href: '/saas-link-building', title: 'SaaS Link Building' },
  { href: '/ecommerce-link-building', title: 'Ecommerce Link Building' },
  { href: '/b2b-services-link-building', title: 'B2B Services Link Building' },
  { href: '/local-business-link-building', title: 'Local Business Link Building' },
];

export const learningResourcesLinks: RelatedLink[] = [
  { href: '/seo-tutorial', title: 'Complete SEO Tutorial' },
  { href: '/seo-case-study', title: 'SEO Case Studies' },
  { href: '/best-seo-books-recommended-by-pros', title: 'Best SEO Books' },
  { href: '/best-seo-newsletters', title: 'Best SEO Newsletters' },
  { href: '/seo-webinars', title: 'SEO Webinars & Training' },
];
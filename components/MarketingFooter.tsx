'use client';

import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';

/**
 * MarketingFooter - Reusable footer component for all marketing pages
 * 
 * Dark background footer with proper contrast for all text elements.
 * Includes brand info, services, company links, and CTA.
 * 
 * Usage:
 * <MarketingFooter />
 */
export default function MarketingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                  Linkio
                </div>
                <div className="text-xs" style={{ color: '#d1d5db' }}>
                  Advanced Link Building Tools
                </div>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#d1d5db' }}>
              Strategic link building for SEO professionals and business owners. Expert curation meets AI efficiency.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#ffffff' }}>
              Services
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/guest-posting-sites" 
                  className="hover:text-white transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                >
                  Guest Posting Sites
                </Link>
              </li>
              <li>
                <Link 
                  href="/anchor-text-optimizer" 
                  className="hover:text-white transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                >
                  Anchor Text Optimizer
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="hover:text-white transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                >
                  SEO Blog & Guides
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.outreachlabs.com/link-building-service/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                >
                  Case Studies
                </a>
              </li>
              <li>
                <span style={{ color: '#9ca3af' }}>
                  Bulk Discounts Available
                </span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#ffffff' }}>
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/account/login" 
                  className="hover:text-white transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link 
                  href="/signup/marketing" 
                  className="hover:text-white transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                >
                  Get Started
                </Link>
              </li>
              <li>
                <Link 
                  href="/directory-submission-sites" 
                  className="hover:text-white transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                >
                  Directory Sites
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#ffffff' }}>
              Get Started
            </h4>
            <p className="text-sm mb-4" style={{ color: '#d1d5db' }}>
              Ready to try strategic link building?
            </p>
            <Link
              href="/signup/marketing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              style={{ 
                backgroundColor: '#2563eb',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              Start Today
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm" style={{ color: '#d1d5db' }}>
            &copy; 2025 Linkio. Advanced link building tools and expert insights.
          </p>
        </div>
      </div>
    </footer>
  );
}
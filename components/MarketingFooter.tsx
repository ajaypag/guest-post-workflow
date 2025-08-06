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
                <div className="text-lg font-semibold text-white">
                  Linkio
                </div>
                <div className="text-xs text-gray-400">
                  Advanced Link Building Tools
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Strategic link building for SEO professionals and business owners. Expert curation meets AI efficiency.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4 text-white">
              Services
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/guest-posting-sites" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Guest Posting Sites
                </Link>
              </li>
              <li>
                <Link 
                  href="/anchor-text-optimizer" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Anchor Text Optimizer
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  SEO Blog & Guides
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.outreachlabs.com/link-building-service/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Case Studies
                </a>
              </li>
              <li>
                <span className="text-gray-500">
                  Bulk Discounts Available
                </span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-white">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/account/login" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link 
                  href="/login" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Get Started
                </Link>
              </li>
              <li>
                <Link 
                  href="/directory-submission-sites" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Directory Sites
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h4 className="font-semibold mb-4 text-white">
              Get Started
            </h4>
            <p className="text-sm mb-4 text-gray-400">
              Ready to try strategic link building?
            </p>
            <Link
              href="/signup/marketing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
            >
              Start Today
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; 2025 Linkio. Advanced link building tools and expert insights.
          </p>
        </div>
      </div>
    </footer>
  );
}
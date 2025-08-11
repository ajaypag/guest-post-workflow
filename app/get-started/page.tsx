'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuickStartFlow from '@/components/onboarding/QuickStartFlow';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';
import { Shield, Zap, Users, Star } from 'lucide-react';

export default function GetStartedPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Check for session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => setSession(null));
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LinkioHeader variant="default" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Get Quality Backlinks in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              3 Simple Steps
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start with your target page, choose your preferences, and we'll find the perfect sites for your brand. 
            Real inventory, transparent pricing, professional content included.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">1000+</div>
            <div className="text-sm text-gray-600">Verified Sites</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Zap className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">Real-time</div>
            <div className="text-sm text-gray-600">Pricing</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">500+</div>
            <div className="text-sm text-gray-600">Happy Clients</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Star className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">4.9/5</div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
        </div>

        {/* Quick Start Flow Component */}
        <QuickStartFlow session={session} />

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                How does the pricing work?
              </h3>
              <p className="text-gray-600 text-sm">
                Each link has two components: the wholesale site cost (varies by site quality) and our $79 content creation fee. 
                You see real-time pricing based on actual available inventory matching your preferences.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                What's included in the $79 content fee?
              </h3>
              <p className="text-gray-600 text-sm">
                Professional SEO-optimized article writing, natural link integration, editing, publishing coordination, 
                and performance tracking. All content is unique and tailored to fit naturally on each site.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                How quickly will I see results?
              </h3>
              <p className="text-gray-600 text-sm">
                Links typically go live within 5-7 business days. SEO impact usually becomes noticeable within 4-8 weeks, 
                with full benefits developing over 3-6 months as Google processes the new links.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I review sites before they publish?
              </h3>
              <p className="text-gray-600 text-sm">
                Yes! After placing your order, you'll receive a curated list of suggested sites matching your preferences. 
                You can approve or reject each site before we proceed with content creation.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
  );
}
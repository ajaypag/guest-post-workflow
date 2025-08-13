'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuickStartFlow from '@/components/onboarding/QuickStartFlow';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import MarketingFooter from '@/components/MarketingFooter';
import { Shield, Zap, Users, Star, Loader2 } from 'lucide-react';

export default function GetStartedPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Get Found When{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Buyers Search
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            When buyers search Google — or ask ChatGPT — does your product show up in the answer?
            We get you in those articles (and AI citations) for the exact searches your buyers use.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">Curated</div>
            <div className="text-sm text-gray-600">Hand-Picked Targets</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Zap className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">Strategic</div>
            <div className="text-sm text-gray-600">Real Authority Sites</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">Transparent</div>
            <div className="text-sm text-gray-600">Clear Costs & Fit</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Star className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">AI-Ready</div>
            <div className="text-sm text-gray-600">Citation-Worthy Content</div>
          </div>
        </div>

        {/* Quick Start Flow Component */}
        <QuickStartFlow />

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                How is this different from traditional link building?
              </h3>
              <p className="text-gray-600 text-sm">
                We focus on getting you into the articles that show up when your buyers search — both on Google and in AI tools. 
                It's curated outreach with hand-picked targets, clear reasoning on why they fit, and transparent costs.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                What makes content "citation-worthy" to AI?
              </h3>
              <p className="text-gray-600 text-sm">
                We create comprehensive, expert-level content with deep research and semantic optimization. 
                AI systems recognize and reference well-researched, authoritative content from trusted domains.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Why do AI citations matter?
              </h3>
              <p className="text-gray-600 text-sm">
                More buyers are using ChatGPT and other AI tools to research products. When they ask about solutions in your space, 
                being mentioned in the AI's response means direct brand awareness at the exact moment of research.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                How do you find the right sites?
              </h3>
              <p className="text-gray-600 text-sm">
                We look for sites with real topical authority in your niche — not just high DR scores. 
                Each target is hand-picked based on relevance, audience fit, and actual ranking potential for your buyer searches.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
    </AuthWrapper>
  );
}
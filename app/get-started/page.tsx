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
            Get Cited by AI in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              48 Hours
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            While competitors wait months for rankings, get your brand mentioned in ChatGPT, Claude, and Perplexity responses. 
            Strategic placement on sites with real topical authority—not vanity metrics.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">Cited</div>
            <div className="text-sm text-gray-600">In AI Responses</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Zap className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">48 Hours</div>
            <div className="text-sm text-gray-600">To First Citation</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">O3</div>
            <div className="text-sm text-gray-600">Research Model</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <Star className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">Zero</div>
            <div className="text-sm text-gray-600">Click Dependence</div>
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
                Everyone can get you links. We engineer AI citations. Our O3-powered research creates content that AI systems 
                actually reference. When ChatGPT needs expert sources, it finds your strategically placed content.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                What makes content "citation-worthy" to AI?
              </h3>
              <p className="text-gray-600 text-sm">
                Our O3 research model spends 10-15 minutes analyzing each topic. We create comprehensive, expert-level content 
                with semantic SEO optimization that AI systems recognize as authoritative sources worth citing.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Why do AI citations matter more than rankings?
              </h3>
              <p className="text-gray-600 text-sm">
                65% of searches now happen in AI. Zero-click searches dominate. When users ask ChatGPT about your industry, 
                being cited means brand awareness without dependency on declining organic click-through rates.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                How do you find sites with real topical authority?
              </h3>
              <p className="text-gray-600 text-sm">
                We analyze proven expertise overlap, not vanity metrics. Our AI maps keyword rankings, authority clusters, 
                and strategic topic overlap to find hidden gems with actual ranking potential in your industry.
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
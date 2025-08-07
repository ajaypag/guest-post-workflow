'use client';

import { useEffect, useState } from 'react';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Search, 
  CheckCircle,
  Users,
  Building2,
  Zap,
  ArrowRight,
  Shield,
  Target,
  PenTool,
  Send,
  Star,
  BarChart3,
  Brain,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import InteractiveWorkflowDemo from '@/components/InteractiveWorkflowDemo';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

interface Stats {
  totalSites: number;
  totalNiches: number;
}

export default function MarketingHomepage() {
  const [stats, setStats] = useState<Stats>({
    totalSites: 13000,
    totalNiches: 100
  });

  useEffect(() => {
    // Fetch stats on client side
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/marketing/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.warn('Could not fetch real-time stats:', error);
        // Keep default values
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Main Message */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-6">
                <Brain className="w-4 h-4" />
                Built for the AI Citation Era
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Thrive in the
                <span className="text-purple-600"> Zero-Click World</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Organic traffic is down. But your sales don't have to be. We place your content 
                where AI systems actually look for authoritative sources—transforming declining clicks into valuable citations.
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Topical authority mapping - content placed where LLMs search for expertise</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">O3-powered research creates citation-worthy content depth</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Strategic brand positioning across your industry's AI-referenced sites</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors text-lg"
                >
                  Dominate AI Citations
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/guest-posting-sites"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
                >
                  <Eye className="w-5 h-5" />
                  See {stats.totalSites.toLocaleString()} Authority Sites
                </Link>
              </div>
            </div>

            {/* Right: Stats Card */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                AI Citation Infrastructure
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {stats.totalSites.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-600">Authority Sites</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">O3</div>
                  <div className="text-sm text-gray-600">Research Model</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {stats.totalNiches}+
                  </div>
                  <div className="text-sm text-gray-600">Topical Clusters</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">Zero</div>
                  <div className="text-sm text-gray-600">Click Dependence</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* How We're Different */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              LLM Citation Engineering vs Traditional Guest Posting
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              While others chase vanity metrics, we optimize for what actually moves the needle in 2025: 
              strategic placement where AI systems discover and cite authoritative sources.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Traditional Approach */}
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                Traditional Guest Posting
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Vanity Metrics Focus</div>
                    <div className="text-sm text-gray-600">Chase high DR without topical relevance analysis</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Traffic-Dependent ROI</div>
                    <div className="text-sm text-gray-600">Success tied to declining organic click-through rates</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Hidden Markups</div>
                    <div className="text-sm text-gray-600">Unclear pricing with variable fees</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Limited Scalability</div>
                    <div className="text-sm text-gray-600">Manual processes that don't scale efficiently</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Our Approach */}
            <div className="bg-purple-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-purple-900 mb-6 flex items-center gap-3">
                <Brain className="w-6 h-6" />
                AI Citation Engineering
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-900">Topical Authority Mapping</div>
                    <div className="text-sm text-purple-700">AI identifies sites with proven expertise overlap in your industry</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-900">LLM Citation Optimization</div>
                    <div className="text-sm text-purple-700">Content designed to be referenced by AI systems, not just ranked</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-900">O3-Powered Research</div>
                    <div className="text-sm text-purple-700">Deep reasoning creates citation-worthy content depth and expertise</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-900">Zero-Click Revenue</div>
                    <div className="text-sm text-purple-700">Brand mentions and citations drive awareness when traffic can't</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study Teaser */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            While Others Chase Traffic, We Build Citations
          </h2>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border mb-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
                <Brain className="w-4 h-4" />
                AI Citation Success
              </div>
            </div>
            
            <blockquote className="text-lg text-gray-700 italic mb-6">
              "DR 71, declining traffic. Most agencies said 'skip it.' We analyzed topical authority, 
              found proven expertise overlap. Now our client gets cited in AI overviews for their industry."
            </blockquote>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">Cited</div>
                <div className="text-sm text-gray-600">In AI overviews</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">Authority</div>
                <div className="text-sm text-gray-600">Topical match</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">Zero</div>
                <div className="text-sm text-gray-600">Click dependence</div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">
            <strong>The difference?</strong> While others focus on DR and traffic, we analyze topical authority overlap. 
            When AI systems need expert sources, they find our strategically placed content.
          </p>
          
          <Link
            href="https://www.outreachlabs.com/link-building-service/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Star className="w-5 h-5" />
            View More Case Studies
          </Link>
        </div>
      </section>

      {/* Interactive Workflow Demo */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              See Our Actual Process In Action
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This isn't marketing fluff - click through our actual production system. 
              Real AI prompts, database queries, and the technical architecture behind each step.
            </p>
          </div>

          <InteractiveWorkflowDemo />
        </div>
      </section>

      {/* Final CTA */}
      <MarketingCTA />

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
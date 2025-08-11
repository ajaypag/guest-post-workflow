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
  Eye,
  AlertCircle
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
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
                <CheckCircle className="w-4 h-4" />
                🎯 Clients Cited in ChatGPT Within 48 Hours
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Get Cited by AI.
                <span className="text-purple-600"> Not Just Ranked by Google.</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                We engineer guest posts that get you mentioned in ChatGPT, Perplexity, and Claude responses—often within days. 
                While competitors wait months for rankings, your brand appears where 65% of searches now happen: AI answers.
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">We find hidden gems others miss—sites with real ranking potential</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">See brand mentions in AI responses within 48-72 hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Traditional SEO benefits PLUS the AI visibility edge</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-lg"
                >
                  Get Your First AI Citation
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
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {stats.totalSites.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-600">Authority Sites</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">O3</div>
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

      {/* The Zero-Click Problem */}
      <section className="py-20 bg-red-50 border-y border-red-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Everyone Gets Links. Only We Get You Cited.
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Traditional link building still works—we do all of that. But we've cracked something extra: 
              making those same links trigger AI citations. One campaign, double the impact.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-red-200">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  What Everyone's Facing
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Google traffic down 25-40% year over year</li>
                  <li>• AI overviews capture clicks before your site loads</li>
                  <li>• ChatGPT users never visit your website</li>
                  <li>• Zero-click searches now exceed click-through results</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-red-200">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Traditional SEO's Fatal Flaw
                </h3>
                <p className="text-gray-700">
                  Still optimizing for 2019? Rankings and traffic don't matter if AI systems 
                  never cite your content as an authoritative source.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  The Citation Economy
                </h3>
                <ul className="space-y-2 text-blue-700">
                  <li>• Brand mentions in AI responses drive awareness</li>
                  <li>• Citations establish industry authority</li>
                  <li>• Topical relevance beats traffic metrics</li>
                  <li>• Strategic placement creates lasting competitive advantage</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Our Solution
                </h3>
                <p className="text-purple-700">
                  We place your content on sites with proven topical authority in your industry. 
                  When AI systems need expert sources, they find you.
                </p>
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
              Premium Link Building + AI Citation Engineering
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every link we build works twice: driving traditional SEO value AND engineering AI citations. 
              Same effort, double the results. Here's what you get that others can't deliver:
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Traditional Approach */}
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                What Every Agency Does
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
            <div className="bg-blue-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-blue-900 mb-6 flex items-center gap-3">
                <Brain className="w-6 h-6" />
                What We Do (Everything + More)
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">AI Citation Engineering</div>
                    <div className="text-sm text-blue-700">Strategic placements on sites with actual topical authority—not vanity metrics</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">LLM Citation Optimization</div>
                    <div className="text-sm text-blue-700">Content designed to be referenced by AI systems, not just ranked</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">O3-Powered Research</div>
                    <div className="text-sm text-blue-700">Deep reasoning creates citation-worthy content depth and expertise</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Zero-Click Revenue</div>
                    <div className="text-sm text-blue-700">Brand mentions and citations drive awareness when traffic can't</div>
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
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                <Brain className="w-4 h-4" />
                AI Citation Success
              </div>
            </div>
            
            <blockquote className="text-lg text-gray-700 italic mb-6">
              "We hired them for link building. Two days later, ChatGPT was recommending our product. 
              Our competitors are still waiting for their 'high DR' links to impact rankings."
            </blockquote>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">Cited</div>
                <div className="text-sm text-gray-600">In AI overviews</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">Authority</div>
                <div className="text-sm text-gray-600">Topical match</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">Zero</div>
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

      {/* Technology Behind the Process */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              Link Building That Triggers AI Citations (Here's How)
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto">
              We place the same high-quality guest posts as premium agencies. The difference? 
              Our AI system identifies exactly which sites and topics trigger citations in ChatGPT, Claude, and Perplexity.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">O3 Deep Research</h3>
              <p className="text-gray-300 mb-4">
                OpenAI's most advanced reasoning model creates citation-worthy content depth. 
                10-15 minutes of deep analysis per article.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Comprehensive source analysis</li>
                <li>• Multi-angle topic exploration</li>
                <li>• Expert-level content depth</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Topical Authority Analysis</h3>
              <p className="text-gray-300 mb-4">
                AI maps proven expertise overlap between your industry and potential host sites. 
                DataForSEO + custom algorithms.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Keyword ranking verification</li>
                <li>• Authority cluster identification</li>
                <li>• Strategic topic overlap scoring</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Citation Optimization</h3>
              <p className="text-gray-300 mb-4">
                Section-by-section semantic SEO audit optimizes content for AI system discovery and reference.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• LLM-friendly content structure</li>
                <li>• Narrative quality control</li>
                <li>• Citation-worthy expertise signals</li>
              </ul>
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
              <Brain className="w-5 h-5" />
              <span className="font-semibold">The Only Link Building Service Proven to Generate AI Citations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workflow Demo */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              See the Technology in Action
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
      <MarketingCTA 
        title="Get Premium Links That Also Get You Cited by AI"
        description="We find the beauty in any site with ranking potential. Real topical authority. Plus something no one else delivers: AI citations in 48 hours."
        primaryButtonText="Start Citation Engineering"
        primaryButtonHref="/signup"
        secondaryButtonText="Explore Authority Database"
        secondaryButtonHref="/guest-posting-sites"
      />

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
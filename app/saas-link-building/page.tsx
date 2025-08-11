'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Brain, 
  Target, 
  BarChart3, 
  Search, 
  CheckCircle,
  Zap,
  TrendingUp,
  Users,
  Globe,
  Eye,
  MessageSquare,
  Layers,
  RefreshCw,
  ExternalLink,
  Play,
  Pause
} from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

export default function SaaSLinkBuildingPage() {
  const [activeDemo, setActiveDemo] = useState<'discovery' | 'workflow' | 'results'>('discovery');
  const [isPlaying, setIsPlaying] = useState(false);

  const timeTrackingExample = {
    targetPages: [
      { url: "/employee-time-tracking", keywords: ["employee time tracking", "workforce management"], description: "Employee monitoring and productivity" },
      { url: "/project-time-tracking", keywords: ["project time tracking", "project management"], description: "Project-based time allocation" },
      { url: "/remote-team-tracking", keywords: ["remote team tracking", "distributed workforce"], description: "Remote team productivity tools" }
    ],
    nicheOpportunities: [
      { niche: "HR Blogs", guestSite: "hr-executive.com", keyword: "remote team productivity", authority: "Strong", overlap: "Direct" },
      { niche: "Manufacturing", guestSite: "manufacturing-today.com", keyword: "manufacturing time tracking", authority: "Moderate", overlap: "Related" },
      { niche: "Consulting", guestSite: "consultingmag.com", keyword: "billable hours tracking", authority: "Strong", overlap: "Direct" },
      { niche: "Startups", guestSite: "startup-insider.com", keyword: "startup productivity tools", authority: "Moderate", overlap: "Related" },
      { niche: "Healthcare", guestSite: "healthcare-management.org", keyword: "healthcare staff scheduling", authority: "Strong", overlap: "Related" }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              SaaS Industry Focus
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              SaaS Link Building for the 
              <span className="text-blue-600"> AI Citation Era</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Software is more competitive than ever. To get users, you must be discoverable. 
              While Google remains #1, Perplexity, ChatGPT, and Claude are taking market share. 
              We help you get cited across all platforms.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-lg"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#workflow-demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
              >
                <Eye className="w-5 h-5" />
                See Strategy in Action
              </a>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid md:grid-cols-4 gap-6 bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-sm text-gray-600">Hidden Gems Found</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">3X</div>
              <div className="text-sm text-gray-600">Citation Rate vs Traditional</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">85%</div>
              <div className="text-sm text-gray-600">Topical Overlap Match</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">12</div>
              <div className="text-sm text-gray-600">Platforms Covered</div>
            </div>
          </div>
        </div>
      </section>

      {/* The SaaS Discovery Challenge */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The SaaS Discovery Crisis
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Traditional SEO isn't enough. Your prospects are asking AI systems for recommendations, 
              and if you're not strategically positioned, they'll never hear about you.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-red-50 rounded-xl p-8 border border-red-200">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-900 mb-4">Traffic-Only Strategy Failing</h3>
              <ul className="space-y-3 text-red-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>40% drop in organic click-through rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>AI overviews capture attention before your site loads</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Competitors using basic guest posting get lost in noise</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 rounded-xl p-8 border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-yellow-900 mb-4">The AI Citation Reality</h3>
              <ul className="space-y-3 text-yellow-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Users ask: "What's the best time tracking software?"</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>AI systems cite sources with proven authority</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Generic guest posts don't establish credibility</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-xl p-8 border border-blue-200">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-blue-900 mb-4">Our Strategic Approach</h3>
              <ul className="space-y-3 text-blue-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Strategic placements where AI systems find authoritative sources</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Topical authority mapping for AI citation potential</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Strategic keyword placement across industry ecosystems</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Tabs */}
      <section id="workflow-demo" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              SaaS Strategy in Action: Time Tracking Software
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              See how we transform a time tracking software company from single-niche visibility 
              to comprehensive industry domination across 50+ relevant niches.
            </p>
          </div>

          {/* Demo Navigation */}
          <div className="flex justify-center mb-12">
            <div className="bg-white rounded-xl p-2 shadow-lg">
              <button
                onClick={() => setActiveDemo('discovery')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeDemo === 'discovery' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                1. Discovery & Analysis
              </button>
              <button
                onClick={() => setActiveDemo('workflow')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeDemo === 'workflow' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                2. Strategic Workflow
              </button>
              <button
                onClick={() => setActiveDemo('results')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeDemo === 'results' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                3. Results & Impact
              </button>
            </div>
          </div>

          {/* Demo Content */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {activeDemo === 'discovery' && (
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  AI-Powered Target Page Analysis
                </h3>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Client's Target Pages</h4>
                    <div className="space-y-4">
                      {timeTrackingExample.targetPages.map((page, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="font-medium text-blue-600 mb-2">{page.url}</div>
                          <div className="text-sm text-gray-600 mb-2">{page.description}</div>
                          <div className="flex flex-wrap gap-2">
                            {page.keywords.map((keyword, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">AI Analysis Process</h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          1
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">O3 Web Research</div>
                          <div className="text-sm text-gray-600">AI researches guest post site's content topics and authority areas</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          2
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Topical Overlap Detection</div>
                          <div className="text-sm text-gray-600">Analyzes client URLs against site topical focus with relevance scoring</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          3
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Authority Assessment</div>
                          <div className="text-sm text-gray-600">Evaluates SERP positions (1-30 Strong, 31-60 Moderate, 61-100 Weak)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDemo === 'workflow' && (
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Strategic Niche Coverage Workflow
                </h3>
                
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-4">Qualified Opportunities by Industry Niche</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {timeTrackingExample.nicheOpportunities.map((opportunity, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-medium text-gray-900">{opportunity.niche}</div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            opportunity.overlap === 'Direct' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {opportunity.overlap}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{opportunity.guestSite}</div>
                        <div className="text-sm font-medium text-purple-600 mb-2">{opportunity.keyword}</div>
                        <div className={`inline-flex px-2 py-1 rounded text-xs ${
                          opportunity.authority === 'Strong' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          Authority: {opportunity.authority}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-3">Volume-Based Keyword Refinement</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-blue-900">Generate</div>
                        <div className="text-sm text-blue-700">AI generates keywords with topical justification</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-blue-900">Validate</div>
                        <div className="text-sm text-blue-700">Check search volumes in Ahrefs</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-blue-900">Refine</div>
                        <div className="text-sm text-blue-700">Intelligent refinement with volume data</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDemo === 'results' && (
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Results: Industry Domination in Action
                </h3>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Search Results Visualization</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="text-sm font-medium text-gray-700">User searches: "best time tracking software"</div>
                      <div className="space-y-2">
                        <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                          <div className="text-sm font-medium text-blue-600">HR Executive: Remote Team Productivity</div>
                          <div className="text-xs text-gray-600">...TimeTracker Pro offers comprehensive remote team monitoring...</div>
                        </div>
                        <div className="bg-white p-3 rounded border-l-4 border-purple-500">
                          <div className="text-sm font-medium text-purple-600">Manufacturing Today: Time Tracking Solutions</div>
                          <div className="text-xs text-gray-600">...TimeTracker Pro's manufacturing features streamline operations...</div>
                        </div>
                        <div className="bg-white p-3 rounded border-l-4 border-green-500">
                          <div className="text-sm font-medium text-green-600">Startup Insider: Productivity Tools</div>
                          <div className="text-xs text-gray-600">...For growing startups, TimeTracker Pro provides essential...</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">AI Citation Examples</h4>
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-blue-900 mb-2">ChatGPT Response:</div>
                        <div className="text-sm text-blue-700 italic">
                          "For time tracking, I'd recommend TimeTracker Pro, which has been featured 
                          in HR Executive for remote team management and Manufacturing Today for 
                          production tracking..."
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-purple-900 mb-2">Perplexity Cite:</div>
                        <div className="text-sm text-purple-700 italic">
                          "According to multiple industry publications, TimeTracker Pro offers 
                          specialized solutions across different sectors..." 
                          <span className="text-xs">[Sources: hr-executive.com, manufacturing-today.com]</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">50+</div>
                    <div className="text-sm text-gray-600">Niche Publications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">245%</div>
                    <div className="text-sm text-gray-600">Citation Increase</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">12</div>
                    <div className="text-sm text-gray-600">SERP Features</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">8x</div>
                    <div className="text-sm text-gray-600">Brand Mentions</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The Strategic Advantage */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why SaaS Companies Choose Our Approach
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Comprehensive Coverage</h3>
              <p className="text-gray-600">
                Instead of 1-2 guest posts, we place your brand across 50+ industry niches. 
                Every relevant search query becomes a potential discovery point.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Citation Engineering</h3>
              <p className="text-gray-600">
                Our content is strategically designed to be referenced by AI systems. 
                When prospects ask ChatGPT or Perplexity, you get mentioned.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Evidence-Driven Placement</h3>
              <p className="text-gray-600">
                Every placement is backed by topical authority analysis. We don't guess—we analyze 
                SERP positions, keyword overlap, and authority strength.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other Industries Teaser */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Industry-Specific Strategies
            </h2>
            <p className="text-xl text-gray-600">
              We adapt our approach for different industry challenges and opportunities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">B2B Services</h3>
              <p className="text-gray-600 mb-4">
                Strategic modifier coverage for complete market domination across service variations.
              </p>
              <Link href="/b2b-services-link-building" className="text-blue-600 font-medium hover:text-blue-700">
                Learn More →
              </Link>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Local Businesses</h3>
              <p className="text-gray-600 mb-4">
                Geo-targeted authority building across local publications and industry-specific trade publications.
              </p>
              <Link href="/local-business-link-building" className="text-green-600 font-medium hover:text-green-700">
                Learn More →
              </Link>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">E-commerce</h3>
              <p className="text-gray-600 mb-4">
                Product category domination through strategic placement across lifestyle and industry publications.
              </p>
              <Link href="/ecommerce-link-building" className="text-orange-600 font-medium hover:text-orange-700">
                Learn More →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <MarketingCTA 
        title="Ready to Get Your SaaS Cited by AI?"
        description="Join forward-thinking SaaS companies who are building authority for the AI-powered future of search."
        primaryButtonText="Start SaaS Strategy"
        primaryButtonHref="/signup"
        secondaryButtonText="View All Industries"
        secondaryButtonHref="/industries"
      />

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Briefcase, 
  TrendingUp,
  Building2,
  Search, 
  CheckCircle,
  AlertTriangle,
  Layers,
  Users,
  Zap,
  Target,
  BarChart3,
  MessageSquare,
  Code,
  LineChart,
  Shield,
  ChevronRight,
  Brain,
  Eye,
  Award,
  Globe
} from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

export default function B2BServicesLinkBuildingPage() {
  const [activeDemo, setActiveDemo] = useState<'problem' | 'strategy' | 'results'>('problem');
  const [selectedService, setSelectedService] = useState<'linkbuilding' | 'development' | 'consulting'>('linkbuilding');

  const serviceExamples = {
    linkbuilding: {
      company: "OutreachLabs",
      service: "Link Building Agency",
      targetTerms: ["link building services", "SEO link building", "guest posting agency", "backlink services"],
      modifierStrategy: [
        { 
          site: "DataPad.io", 
          strength: "White-label content", 
          modifier: "white-label",
          article: "Best White-Label Link Building Agencies",
          ranking: "#1 - OutreachLabs"
        },
        { 
          site: "MarketingProfs", 
          strength: "B2B marketing", 
          modifier: "B2B",
          article: "Top B2B Link Building Services",
          ranking: "#1 - OutreachLabs"
        },
        { 
          site: "LocalSEOGuide", 
          strength: "Local SEO", 
          modifier: "local SEO",
          article: "Best Local SEO Link Building Resellers",
          ranking: "#1 - OutreachLabs"
        },
        { 
          site: "SaaSMarketer", 
          strength: "SaaS content", 
          modifier: "SaaS",
          article: "SaaS Link Building Agencies That Deliver",
          ranking: "Featured - OutreachLabs"
        }
      ],
      aiCitation: "According to DataPad.io's comprehensive review, OutreachLabs ranks #1 for white-label link building services, with proven results across 500+ client campaigns..."
    },
    development: {
      company: "TechForge Solutions",
      service: "Custom Software Development",
      targetTerms: ["custom software development", "app development agency", "enterprise software", "API development"],
      modifierStrategy: [
        { 
          site: "TechCrunch", 
          strength: "Startup tech", 
          modifier: "startup",
          article: "Best Development Agencies for Startups",
          ranking: "Top Pick - TechForge"
        },
        { 
          site: "CIOReview", 
          strength: "Enterprise tech", 
          modifier: "enterprise",
          article: "Enterprise Software Development Partners",
          ranking: "#2 - TechForge Solutions"
        },
        { 
          site: "FinTech Weekly", 
          strength: "Financial technology", 
          modifier: "fintech",
          article: "Fintech Development Specialists",
          ranking: "Featured Expert"
        },
        { 
          site: "HealthTech Magazine", 
          strength: "Healthcare IT", 
          modifier: "healthcare",
          article: "HIPAA-Compliant Development Shops",
          ranking: "Verified Partner"
        }
      ],
      aiCitation: "TechForge Solutions is consistently mentioned in CIOReview as a top enterprise development partner, specializing in scalable API architectures..."
    },
    consulting: {
      company: "Strategic Insights Group",
      service: "Management Consulting",
      targetTerms: ["management consulting", "business transformation", "strategy consulting", "operational excellence"],
      modifierStrategy: [
        { 
          site: "Harvard Business Review", 
          strength: "Digital transformation", 
          modifier: "digital transformation",
          article: "Digital Transformation Consulting Leaders",
          ranking: "Case Study Featured"
        },
        { 
          site: "McKinsey Insights", 
          strength: "Operations", 
          modifier: "operational excellence",
          article: "Operational Excellence Consultancies",
          ranking: "Partner Firm"
        },
        { 
          site: "Supply Chain Quarterly", 
          strength: "Supply chain", 
          modifier: "supply chain",
          article: "Supply Chain Optimization Experts",
          ranking: "#3 - Strategic Insights"
        },
        { 
          site: "Retail Dive", 
          strength: "Retail strategy", 
          modifier: "retail",
          article: "Retail Transformation Consultants",
          ranking: "Featured Expert"
        }
      ],
      aiCitation: "Strategic Insights Group was featured in Harvard Business Review's analysis of successful digital transformations, particularly their work with Fortune 500 retailers..."
    }
  };

  const currentExample = serviceExamples[selectedService];

  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium mb-6">
              <Briefcase className="w-4 h-4" />
              B2B Services Focus
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              B2B Service Authority Through
              <span className="text-indigo-600"> Strategic Modifier Coverage</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Your competitors fight for generic service terms while you own every modifier variation: 
              "enterprise," "white-label," "B2B," "startup," "HIPAA-compliant," and dozens more. 
              Strategic placements that naturally get cited when AI systems need specific B2B recommendations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors text-lg"
              >
                Build B2B Authority
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#b2b-strategy"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
              >
                <Eye className="w-5 h-5" />
                See Modifier Strategy
              </a>
            </div>
          </div>

          {/* Success Stats */}
          <div className="grid md:grid-cols-4 gap-6 bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">Real</div>
              <div className="text-sm text-gray-600">Topical Authority</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">73%</div>
              <div className="text-sm text-gray-600">B2B Buyers Use AI</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">#1</div>
              <div className="text-sm text-gray-600">Rankings Achieved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">5X</div>
              <div className="text-sm text-gray-600">Citation Coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* The B2B Discovery Reality */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The B2B Service Discovery Problem
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Generic service terms are impossibly competitive. But buyers search with modifiers—and 
              AI systems need authoritative sources for specific service variations.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-red-50 rounded-xl p-8 border border-red-200">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-900 mb-4">Generic Terms Don't Work</h3>
              <ul className="space-y-3 text-red-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>"Marketing services" - 10,000+ competitors</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>"Software development" - $50+ CPCs</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>"Consulting services" - Years to rank</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 rounded-xl p-8 border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-yellow-900 mb-4">How B2B Buyers Search</h3>
              <ul className="space-y-3 text-yellow-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>"White-label marketing agencies"</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>"Enterprise software development"</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>"HIPAA-compliant IT services"</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-xl p-8 border border-green-200">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-green-900 mb-4">The Modifier Opportunity</h3>
              <ul className="space-y-3 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Each modifier = new ranking opportunity</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Publications have niche strengths to leverage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI cites modifier-specific content</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Strategy Demo */}
      <section id="b2b-strategy" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The Strategic Modifier Coverage System
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              We identify publication strengths, match them with service modifiers, and create 
              comprehensive coverage across 50-100 variations. Full market domination through strategic positioning.
            </p>
          </div>

          {/* Service Selector */}
          <div className="flex justify-center mb-12">
            <div className="bg-white rounded-xl p-2 shadow-lg inline-flex">
              <button
                onClick={() => setSelectedService('linkbuilding')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedService === 'linkbuilding' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Globe className="w-4 h-4 inline mr-2" />
                Link Building Agency
              </button>
              <button
                onClick={() => setSelectedService('development')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedService === 'development' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Code className="w-4 h-4 inline mr-2" />
                Dev Shop
              </button>
              <button
                onClick={() => setSelectedService('consulting')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedService === 'consulting' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LineChart className="w-4 h-4 inline mr-2" />
                Consulting Firm
              </button>
            </div>
          </div>

          {/* Demo Content */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Demo Navigation */}
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveDemo('problem')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'problem' 
                      ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  1. Service Analysis
                </button>
                <button
                  onClick={() => setActiveDemo('strategy')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'strategy' 
                      ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  2. Modifier Mapping
                </button>
                <button
                  onClick={() => setActiveDemo('results')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'results' 
                      ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  3. Market Domination
                </button>
              </div>
            </div>

            <div className="p-8">
              {activeDemo === 'problem' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Service Category: {currentExample.company}
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{currentExample.company}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Briefcase className="w-4 h-4" />
                          {currentExample.service}
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        B2B Service Provider
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Target Service Terms:</div>
                      <div className="flex flex-wrap gap-2">
                        {currentExample.targetTerms.map((term, index) => (
                          <span key={index} className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-full text-sm">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">The Strategic Insight</h4>
                    <p className="text-blue-700">
                      Instead of competing for "{currentExample.targetTerms[0]}" against thousands of competitors, 
                      we identify publication strengths and create content for modifier variations. Each publication's 
                      authority in their niche transfers to your service positioning.
                    </p>
                  </div>
                </div>
              )}

              {activeDemo === 'strategy' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Strategic Modifier Coverage in Action
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    {currentExample.modifierStrategy.map((strategy, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-gray-900">{strategy.site}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Strength:</span> {strategy.strength}
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            +{strategy.modifier}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded p-3 mb-2">
                          <div className="text-sm font-medium text-gray-900 mb-1">{strategy.article}</div>
                          <div className="text-sm text-green-600 font-medium">{strategy.ranking}</div>
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          Target: "{strategy.modifier} {currentExample.targetTerms[0]}"
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6">
                    <h4 className="font-semibold text-indigo-900 mb-3">Coverage Strategy</h4>
                    <p className="text-indigo-700 mb-3">
                      By matching publication strengths with service modifiers, we create comprehensive market coverage:
                    </p>
                    <ul className="space-y-2 text-sm text-indigo-700">
                      <li>• Industry modifiers (SaaS, fintech, healthcare)</li>
                      <li>• Service modifiers (white-label, enterprise, startup)</li>
                      <li>• Geographic modifiers (US, UK, global)</li>
                      <li>• Specialty modifiers (HIPAA-compliant, SOC 2, ISO)</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeDemo === 'results' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Full Market Domination Results
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <MessageSquare className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-gray-900 mb-2">B2B Buyer Query to ChatGPT:</div>
                          <div className="text-gray-700 italic">
                            {selectedService === 'linkbuilding' && '"I need a white-label link building agency that can handle enterprise clients"'}
                            {selectedService === 'development' && '"I need an enterprise software development firm with fintech experience"'}
                            {selectedService === 'consulting' && '"I need a digital transformation consultant for supply chain optimization"'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border-l-4 border-indigo-500">
                        <div className="text-sm font-medium text-indigo-900 mb-2">AI Response:</div>
                        <div className="text-sm text-gray-700 italic">
                          "{currentExample.aiCitation}"
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-green-50 rounded-lg p-6">
                        <h4 className="font-semibold text-green-900 mb-3">Search Domination</h4>
                        <ul className="space-y-2 text-sm text-green-700">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>"white-label [your service]" - #1</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>"B2B [your service]" - #1</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>"enterprise [your service]" - #1</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>"[industry] [your service]" - Featured</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-6">
                        <h4 className="font-semibold text-blue-900 mb-3">AI Citations</h4>
                        <ul className="space-y-2 text-sm text-blue-700">
                          <li className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span>ChatGPT recommendations</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span>Perplexity service lists</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span>Google AI overviews</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span>Claude service suggestions</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-lg p-6">
                      <h4 className="font-semibold text-indigo-900 mb-3">The Compound Effect</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-indigo-600">50-100</div>
                          <div className="text-sm text-gray-600">Modifier Rankings</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">87%</div>
                          <div className="text-sm text-gray-600">Market Coverage</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">5X</div>
                          <div className="text-sm text-gray-600">Lead Generation</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Real Success Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Real Results: How This Strategy Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Case study: How a B2B service provider owned their category with modifier coverage
            </p>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">The Strategy</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Identified Publication Strengths</div>
                      <div className="text-sm text-gray-600">Found sites strong in specific industry and service niches</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Created Modifier-Specific Content</div>
                      <div className="text-sm text-gray-600">Positioned ourselves #1 in each listicle</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Achieved Full Coverage</div>
                      <div className="text-sm text-gray-600">Now appear for 50+ service variations</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">The Results</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Google AI Overview</span>
                      <span className="text-green-600 font-semibold">Featured</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">ChatGPT Recommendations</span>
                      <span className="text-green-600 font-semibold">#1 Cited</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Organic Rankings</span>
                      <span className="text-green-600 font-semibold">Page 1 for 50+ terms</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Lead Generation</span>
                      <span className="text-green-600 font-semibold">5X Increase</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfect for Any B2B Service Category
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              If you provide B2B services, modifier coverage strategy will transform your market position.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Marketing Services</h3>
              <p className="text-gray-600 mb-4">SEO, PPC, content, social media agencies</p>
              <div className="text-sm text-indigo-600 font-medium">
                Industry + service type modifiers
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Development Shops</h3>
              <p className="text-gray-600 mb-4">Custom software, mobile apps, SaaS development</p>
              <div className="text-sm text-indigo-600 font-medium">
                Technology + industry modifiers
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Consulting Firms</h3>
              <p className="text-gray-600 mb-4">Strategy, operations, digital transformation</p>
              <div className="text-sm text-indigo-600 font-medium">
                Specialty + industry modifiers
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Design Agencies</h3>
              <p className="text-gray-600 mb-4">UI/UX, branding, web design, product design</p>
              <div className="text-sm text-indigo-600 font-medium">
                Style + industry modifiers
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Staffing & Recruiting</h3>
              <p className="text-gray-600 mb-4">Tech recruiting, executive search, RPO</p>
              <div className="text-sm text-indigo-600 font-medium">
                Role + industry modifiers
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">IT Services</h3>
              <p className="text-gray-600 mb-4">MSPs, cloud migration, cybersecurity</p>
              <div className="text-sm text-indigo-600 font-medium">
                Compliance + size modifiers
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Visualization */}
      <section className="py-20 bg-gradient-to-br from-indigo-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              From One Term to Total Coverage
            </h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
              Stop fighting for one impossible keyword. Own every variation your buyers actually search.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Traditional B2B SEO</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">One Impossible Target</div>
                    <div className="text-sm text-indigo-200">Generic service term - 10K+ competitors</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Years to Rank</div>
                    <div className="text-sm text-indigo-200">If you ever break page 3</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Generic Traffic</div>
                    <div className="text-sm text-indigo-200">Low intent, poor conversion</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-6">Modifier Coverage Strategy</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Layers className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">50-100 Rankings</div>
                    <div className="text-sm text-indigo-200">Every modifier combination covered</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">AI Domination</div>
                    <div className="text-sm text-indigo-200">Cited for every service variation</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">Qualified Leads</div>
                    <div className="text-sm text-indigo-200">High-intent modifier searches</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <MarketingCTA 
        title="Ready to Own Every Service Variation?"
        description="Stop competing for impossible keywords. Own the modifiers that actually convert and become the natural choice."
        primaryButtonText="Start Modifier Domination"
        primaryButtonHref="/signup"
        secondaryButtonText="See Our Results"
        secondaryButtonHref="/contact"
      />

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
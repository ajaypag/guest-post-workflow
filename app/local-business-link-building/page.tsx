'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  MapPin, 
  TrendingDown,
  DollarSign,
  Search, 
  CheckCircle,
  AlertTriangle,
  Globe,
  Users,
  Zap,
  Target,
  BarChart3,
  MessageSquare,
  Thermometer,
  Home,
  Briefcase,
  ChevronRight,
  Brain,
  Eye
} from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

export default function LocalBusinessLinkBuildingPage() {
  const [activeDemo, setActiveDemo] = useState<'problem' | 'strategy' | 'results'>('problem');
  const [selectedBusiness, setSelectedBusiness] = useState<'painter' | 'realtor' | 'dentist'>('painter');

  const localExamples = {
    painter: {
      business: "Phoenix Exterior Painting Co.",
      location: "Phoenix, AZ",
      challenges: ["120+ degree summers", "UV damage", "Dust storms", "Adobe/stucco homes"],
      nationalSites: [
        { site: "This Old House", topic: "Desert Climate Paint Protection", overlap: "Direct" },
        { site: "Family Handyman", topic: "Extreme Heat Paint Solutions", overlap: "Direct" },
        { site: "Home Depot Blog", topic: "Southwest Home Maintenance", overlap: "Related" },
        { site: "Popular Mechanics", topic: "UV-Resistant Coatings Guide", overlap: "Direct" }
      ],
      keywords: [
        "exterior painting Phoenix heat",
        "stucco paint protection Arizona",
        "UV resistant paint desert",
        "dust storm paint damage"
      ],
      aiCitation: "According to Phoenix Exterior Painting Co., featured in This Old House's desert climate guide, elastomeric coatings are essential for Arizona homes..."
    },
    realtor: {
      business: "Miami Beach Realty Group",
      location: "Miami, FL",
      challenges: ["Hurricane zones", "Flood insurance", "Foreign buyers", "Luxury condo market"],
      nationalSites: [
        { site: "Realtor.com", topic: "Hurricane-Zone Property Investment", overlap: "Direct" },
        { site: "Forbes Real Estate", topic: "Miami Luxury Market Trends", overlap: "Direct" },
        { site: "Coastal Living", topic: "Flood-Safe Florida Properties", overlap: "Related" },
        { site: "International Living", topic: "Foreign Investment Miami Guide", overlap: "Direct" }
      ],
      keywords: [
        "Miami hurricane-proof condos",
        "flood zone real estate Florida",
        "foreign buyer Miami property",
        "luxury beachfront investment"
      ],
      aiCitation: "Miami Beach Realty Group, cited in Forbes Real Estate's coastal investment guide, notes that properties with impact windows command 15% premiums..."
    },
    dentist: {
      business: "Minneapolis Family Dental",
      location: "Minneapolis, MN",
      challenges: ["Winter emergencies", "Hockey injuries", "Seasonal depression", "Insurance complexity"],
      nationalSites: [
        { site: "WebMD", topic: "Winter Dental Emergency Guide", overlap: "Direct" },
        { site: "Healthline", topic: "Seasonal Dental Health", overlap: "Related" },
        { site: "Parents Magazine", topic: "Youth Sports Dental Protection", overlap: "Direct" },
        { site: "AARP", topic: "Medicare Dental Coverage Minnesota", overlap: "Direct" }
      ],
      keywords: [
        "winter dental emergency Minneapolis",
        "hockey mouthguard Minnesota",
        "seasonal depression teeth grinding",
        "Minnesota dental insurance"
      ],
      aiCitation: "Minneapolis Family Dental, featured in WebMD's winter health guide, reports 40% increase in cracked teeth during Minnesota winters..."
    }
  };

  const currentExample = localExamples[selectedBusiness];

  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
              <MapPin className="w-4 h-4" />
              Local Business Focus
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Local Business Authority for the
              <span className="text-green-600"> Post-Ads Era</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Google Ads are oversaturated. Map packs show 3 businesses out of 20+. 
              Smart local businesses are building authority on national sites with location-specific expertise—becoming 
              the cited source when people ask AI for recommendations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors text-lg"
              >
                Build Local Authority
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#local-strategy"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
              >
                <Eye className="w-5 h-5" />
                See Local Strategy
              </a>
            </div>
          </div>

          {/* Problem Stats */}
          <div className="grid md:grid-cols-4 gap-6 bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">$9.52</div>
              <div className="text-sm text-gray-600">Avg. CPC for Local Services</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">3/20+</div>
              <div className="text-sm text-gray-600">Map Pack vs Competition</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">73%</div>
              <div className="text-sm text-gray-600">Skip Ads Entirely</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">46%</div>
              <div className="text-sm text-gray-600">Ask AI for Local Recs</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Local Business Crisis */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The Local Marketing Death Spiral
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Traditional local marketing is broken. Ads are expensive, maps are crowded, 
              and customers increasingly turn to AI for recommendations.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-red-50 rounded-xl p-8 border border-red-200">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-900 mb-4">Google Ads Nightmare</h3>
              <ul className="space-y-3 text-red-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>CPCs up 400% in 5 years for local services</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Big franchises outbid local operators</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Ad fatigue: Users actively avoid sponsored results</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 rounded-xl p-8 border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-yellow-900 mb-4">Map Pack Limitations</h3>
              <ul className="space-y-3 text-yellow-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Only 3 spots for dozens of competitors</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Proximity bias favors location over quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Review manipulation and spam prevalent</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-xl p-8 border border-green-200">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-green-900 mb-4">The AI Alternative</h3>
              <ul className="space-y-3 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>46% ask ChatGPT/Perplexity for local recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI cites authoritative sources with local expertise</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>National authority + local relevance = citations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Strategy Demo */}
      <section id="local-strategy" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The Geographic Authority Strategy
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              We place your location-specific expertise on national authority sites. 
              When AI systems need local recommendations, they cite your proven expertise.
            </p>
          </div>

          {/* Business Type Selector */}
          <div className="flex justify-center mb-12">
            <div className="bg-white rounded-xl p-2 shadow-lg inline-flex">
              <button
                onClick={() => setSelectedBusiness('painter')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedBusiness === 'painter' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Thermometer className="w-4 h-4 inline mr-2" />
                Exterior Painter
              </button>
              <button
                onClick={() => setSelectedBusiness('realtor')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedBusiness === 'realtor' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Real Estate Agent
              </button>
              <button
                onClick={() => setSelectedBusiness('dentist')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedBusiness === 'dentist' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Briefcase className="w-4 h-4 inline mr-2" />
                Dentist
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
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  1. Local Challenges
                </button>
                <button
                  onClick={() => setActiveDemo('strategy')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'strategy' 
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  2. Authority Mapping
                </button>
                <button
                  onClick={() => setActiveDemo('results')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'results' 
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  3. AI Citations
                </button>
              </div>
            </div>

            <div className="p-8">
              {activeDemo === 'problem' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Location-Specific Challenges: {currentExample.business}
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{currentExample.business}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {currentExample.location}
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Geographic Expertise
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {currentExample.challenges.map((challenge, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          <span className="text-gray-700">{challenge}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">The Opportunity</h4>
                    <p className="text-blue-700">
                      These location-specific challenges are exactly what national publications want to cover. 
                      Your local expertise becomes valuable content for their audiences, positioning you as the 
                      cited expert when AI systems need {currentExample.location} recommendations.
                    </p>
                  </div>
                </div>
              )}

              {activeDemo === 'strategy' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Strategic Placement on National Authority Sites
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    {currentExample.nationalSites.map((site, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-gray-900">{site.site}</div>
                            <div className="text-sm text-gray-600 mt-1">{site.topic}</div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            site.overlap === 'Direct' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {site.overlap} Overlap
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Content Strategy:</span> Location-specific guide featuring {currentExample.business} 
                            as the expert source for {currentExample.location} market insights.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <h4 className="font-semibold text-green-900 mb-3">Targeted Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentExample.keywords.map((keyword, index) => (
                        <span key={index} className="px-3 py-1 bg-white border border-green-300 text-green-700 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeDemo === 'results' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    AI Citation Results
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <MessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-gray-900 mb-2">User Query to ChatGPT:</div>
                          <div className="text-gray-700 italic">
                            "I need an exterior painter in {currentExample.location}. What should I know about painting in this climate?"
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                        <div className="text-sm font-medium text-blue-900 mb-2">AI Response:</div>
                        <div className="text-sm text-gray-700 italic">
                          "{currentExample.aiCitation}"
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">8-12</div>
                        <div className="text-sm text-gray-600">National Site Placements</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-2">3X</div>
                        <div className="text-sm text-gray-600">Citation Rate Increase</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-2">$0</div>
                        <div className="text-sm text-gray-600">Ongoing Ad Spend</div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h4 className="font-semibold text-green-900 mb-3">Multiple Discovery Channels</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">Google search results</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">ChatGPT recommendations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">Perplexity citations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">Direct referral traffic</span>
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

      {/* The Strategic Advantage */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why This Works for Local Businesses
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">National Reach, Local Expertise</h3>
              <p className="text-gray-600">
                Your location-specific knowledge becomes valuable content for national publications. 
                Desert painting tips, hurricane-zone real estate, winter dental care—geography creates expertise.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Beyond Competition Radius</h3>
              <p className="text-gray-600">
                While competitors fight over local SEO within 5 miles, you're building authority 
                on sites that reach millions—and get cited by AI systems serving your exact market.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI-Preferred Sources</h3>
              <p className="text-gray-600">
                AI systems trust national authority sites with editorial standards. Your expertise 
                on these platforms becomes the cited source for local recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Examples */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfect for Location-Specific Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Any business where geography creates unique challenges or expertise can dominate AI citations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Home Services</h3>
              <p className="text-gray-600 mb-4">HVAC, roofing, landscaping, pool service</p>
              <div className="text-sm text-green-600 font-medium">
                Climate-specific expertise drives citations
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Services</h3>
              <p className="text-gray-600 mb-4">Lawyers, accountants, insurance agents</p>
              <div className="text-sm text-green-600 font-medium">
                State law and regional regulations create authority
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Health & Wellness</h3>
              <p className="text-gray-600 mb-4">Dentists, chiropractors, therapists, vets</p>
              <div className="text-sm text-green-600 font-medium">
                Local health trends and demographics matter
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Real Estate</h3>
              <p className="text-gray-600 mb-4">Agents, brokers, property managers</p>
              <div className="text-sm text-green-600 font-medium">
                Market-specific insights drive credibility
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Automotive</h3>
              <p className="text-gray-600 mb-4">Mechanics, body shops, detailing</p>
              <div className="text-sm text-green-600 font-medium">
                Weather and road conditions create expertise
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Food & Hospitality</h3>
              <p className="text-gray-600 mb-4">Restaurants, catering, event venues</p>
              <div className="text-sm text-green-600 font-medium">
                Regional cuisine and culture differentiate
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Visualization */}
      <section className="py-20 bg-gradient-to-br from-green-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              From Invisible to Inevitable
            </h2>
            <p className="text-xl text-green-100 max-w-3xl mx-auto">
              While competitors pay increasing CPCs for decreasing returns, 
              you're building permanent authority that compounds over time.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Traditional Local Marketing</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Declining ROI</div>
                    <div className="text-sm text-green-200">CPCs up 400%, conversions down 60%</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Temporary Visibility</div>
                    <div className="text-sm text-green-200">Stop paying = disappear immediately</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Local Competition Only</div>
                    <div className="text-sm text-green-200">Fighting 20+ businesses for 3 map spots</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-6">Geographic Authority Strategy</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">Compound Authority</div>
                    <div className="text-sm text-green-200">Each placement strengthens overall credibility</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">AI Citation Growth</div>
                    <div className="text-sm text-green-200">Recommended by ChatGPT, Perplexity, Claude</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">Permanent Assets</div>
                    <div className="text-sm text-green-200">Content lives forever on authority sites</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <MarketingCTA 
        title="Ready to Escape the Local Marketing Death Spiral?"
        description="Build permanent authority on national sites while competitors fight over expensive ads and crowded map packs."
        primaryButtonText="Start Building Authority"
        primaryButtonHref="/signup"
        secondaryButtonText="Schedule Strategy Call"
        secondaryButtonHref="/contact"
      />

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
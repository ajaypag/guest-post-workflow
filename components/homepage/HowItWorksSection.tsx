'use client';

import { 
  Globe,
  Search,
  Brain,
  FileText,
  CheckCircle,
  ArrowRight,
  Target,
  BarChart3,
  Zap,
  Eye,
  PenTool,
  TrendingUp,
  Link
} from 'lucide-react';

export default function HowItWorksSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            PROVEN SYSTEM • AI-POWERED • DONE FOR YOU
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            How We Get You Into Every Comparison
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Our proven workflow combines AI intelligence with strategic placement. 
            Here's the exact process that puts you in front of buyers.
          </p>
        </div>

        {/* Process Steps */}
        <div className="space-y-8 mb-16">
          
          {/* Step 1: Site Selection */}
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 order-2 lg:order-1">
              <div className="bg-blue-50 rounded-2xl p-8 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Find Sites That Rank</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  We identify websites already ranking for your target keywords - the ones buyers actually search.
                  Not random high DR sites, but publications with proven topical authority.
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="text-sm text-gray-600 mb-2">Example target searches:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">"monday alternatives"</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">"best project management"</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">"[competitor] vs"</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 order-1 lg:order-2">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white">
                <Globe className="w-10 h-10" />
              </div>
            </div>
          </div>

          {/* Step 2: Strategic Topic Development */}
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white">
                <Brain className="w-10 h-10" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="bg-purple-50 rounded-2xl p-8 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Create Bottom-Funnel Topics</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  AI analyzes the site's audience and your product to create comparison content 
                  that naturally features you as the top choice. Not generic guest posts - strategic positioning.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="text-xs text-purple-600 font-medium mb-1">Comparison Articles</div>
                    <div className="text-sm text-gray-700">"Top 7 Monday Alternatives"</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="text-xs text-purple-600 font-medium mb-1">VS Content</div>
                    <div className="text-sm text-gray-700">"[Your Brand] vs Competitor"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Target Page Intelligence */}
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 order-2 lg:order-1">
              <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Target Page Intelligence</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  We scour everything known about your product: reviews, differentiators, use cases. 
                  Then identify gaps - what buyers need to know that isn't out there yet.
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <div className="text-xs text-green-600 font-medium mb-2">Intelligence process:</div>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div>• Research everything publicly known</div>
                    <div>• Identify information gaps for buyers</div>
                    <div>• Work with you to fill missing pieces</div>
                    <div>• Create original content not found elsewhere</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 order-1 lg:order-2">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white">
                <BarChart3 className="w-10 h-10" />
              </div>
            </div>
          </div>

          {/* Step 4: Content Creation */}
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white">
                <PenTool className="w-10 h-10" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="bg-orange-50 rounded-2xl p-8 border border-orange-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Create Bottom-Funnel Content</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  Bottom-funnel content: comparisons, buyer guides, how-to content. 
                  Section-by-section creation with semantic SEO optimization that search engines love.
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-orange-100">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Section-by-section writing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Semantic SEO editing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Human readability pass</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Formatting & images</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Placement & Tracking */}
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 order-2 lg:order-1">
              <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    5
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Place & Track Results</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  Content goes live on approved sites. We handle placement, QA, and ensure articles stay up. 
                  You start showing up where buyers research solutions.
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
                    <div className="text-xs text-gray-600">Placement & QA</div>
                  </div>
                  <div className="text-center">
                    <Eye className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
                    <div className="text-xs text-gray-600">Ensure articles stay live</div>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
                    <div className="text-xs text-gray-600">You start ranking</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 order-1 lg:order-2">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white">
                <Link className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>

        {/* What Makes This Different */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-12">
          <h3 className="text-2xl font-bold mb-6 text-center">
            What Makes This Different
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Target className="w-8 h-8 mx-auto mb-3 text-blue-200" />
              <h4 className="font-semibold mb-2">Bottom-Funnel Only</h4>
              <p className="text-sm text-blue-100">
                We only target buyer-intent searches. No vanity traffic.
              </p>
            </div>
            
            <div className="text-center">
              <Brain className="w-8 h-8 mx-auto mb-3 text-purple-200" />
              <h4 className="font-semibold mb-2">Deep Intelligence</h4>
              <p className="text-sm text-purple-100">
                Real product understanding, not generic mentions.
              </p>
            </div>
            
            <div className="text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-3 text-pink-200" />
              <h4 className="font-semibold mb-2">Proven Results</h4>
              <p className="text-sm text-pink-100">
                473 companies dominating their categories.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-2">
            The entire process is done for you.
          </p>
          <p className="text-2xl font-bold text-gray-900">
            You just provide your target page. We handle the rest.
          </p>
        </div>
      </div>
    </section>
  );
}
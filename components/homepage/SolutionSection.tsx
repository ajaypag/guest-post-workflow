'use client';

import { 
  Target,
  Search,
  FileEdit,
  CheckCircle,
  Sparkles,
  BarChart3,
  Brain,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function SolutionSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Our Solution
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            We Find Sites Where Your Buyers Are Already Looking
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Others throw darts at random high-DR sites hoping something sticks. 
            We strategically place you where buyers research alternatives to you.
          </p>
        </div>

        {/* The 3-Step Process */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Step 1 */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 h-full border border-blue-200">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-white" />
              </div>
              
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">
                Find Sites That Already Rank
              </h3>
              
              <p className="text-sm text-gray-600 mb-3">
                We identify websites already ranking for your buyer searches - where people compare alternatives and research solutions
              </p>
              
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">Target searches:</div>
                <div className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                  "[competitor] alternatives"
                </div>
                <div className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                  "best [category] software"
                </div>
                <div className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                  "[your brand] vs [competitor]"
                </div>
              </div>
            </div>
            
            {/* Arrow to next step */}
            <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
              <ArrowRight className="w-8 h-8 text-gray-300" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 h-full border border-purple-200">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">
                Research Your Product Deep
              </h3>
              
              <p className="text-sm text-gray-600 mb-3">
                We study everything about your product: features, differentiators, use cases, and what makes you unique
              </p>
              
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">Deep product understanding</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">Identify key differentiators</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">Find information gaps</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Arrow to next step */}
            <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
              <ArrowRight className="w-8 h-8 text-gray-300" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 h-full border border-green-200">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <FileEdit className="w-6 h-6 text-white" />
              </div>
              
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">
                Create Strategic Content
              </h3>
              
              <p className="text-sm text-gray-600 mb-3">
                We write comparison content tailored to each site that naturally positions you as the top choice
              </p>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600">Matches each site's style</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600">2000+ words, not fluff</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600">Strategic positioning</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Differentiator */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 mb-16 border border-purple-200">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
                  <Target className="w-4 h-4" />
                  The Key Difference
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Strategic Placement vs Random Outreach
                </h3>
                
                <p className="text-gray-600 mb-4">
                  We don't chase vanity metrics. Every placement is where your buyers already research solutions.
                </p>
                
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      <strong>Sites that rank for buyer searches</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      <strong>Content that fits each audience</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      <strong>Deep product understanding, not generic mentions</strong>
                    </span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  What You Get
                </h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Research</span>
                    <span className="text-sm font-bold text-gray-900">Buyer search mapping</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Sites</span>
                    <span className="text-sm font-bold text-gray-900">Where buyers compare</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Content</span>
                    <span className="text-sm font-bold text-gray-900">Strategic comparisons</span>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3 mt-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-purple-900">You show up where it matters</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-2">
            While others chase random high-DR sites...
          </p>
          <p className="text-xl font-semibold text-gray-900">
            You'll get strategic positioning where buyers actually research
          </p>
        </div>
      </div>
    </section>
  );
}
'use client';

import { 
  TrendingDown,
  Search,
  AlertTriangle,
  XCircle,
  Brain,
  Target
} from 'lucide-react';

export default function ProblemSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Top-of-Funnel SEO Is Dead. The Opportunity Has Shifted.
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            AI and zero-click searches killed informational content. The only SEO worth doing now? Bottom-funnel placements where buyers actually convert.
          </p>
        </div>

        {/* Problem Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Problem 1: Zero Click Searches */}
          <div className="bg-white rounded-xl p-6 border border-red-100 hover:border-red-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-lg">
                  60% of Searches End Without Clicks
                </h3>
                <p className="text-gray-600">
                  AI extracts your content for instant answers. 77% zero-click rate on informational queries.
                </p>
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <TrendingDown className="w-4 h-4" />
                  <span>Projected 70%+ by 2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* Problem 2: AI Takes Without Giving */}
          <div className="bg-white rounded-xl p-6 border border-red-100 hover:border-red-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-lg">
                  AI Scrapes 179x More Than It Sends Back
                </h3>
                <p className="text-gray-600">
                  Your content powers AI answers with zero attribution. B2B SaaS gets only 0.2%-1% AI traffic.
                </p>
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <XCircle className="w-4 h-4" />
                  <span>All take, no give</span>
                </div>
              </div>
            </div>
          </div>

          {/* Problem 3: Bottom-Funnel Wins */}
          <div className="bg-white rounded-xl p-6 border border-red-100 hover:border-red-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Bottom-Funnel Converts 47% Better
                </h3>
                <p className="text-gray-600">
                  Yet everyone chases top-funnel keywords while comparisons and alternatives drive real results.
                </p>
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Wrong funnel targeting</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Real Problem Statement */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 border border-red-200">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium mb-4">
              <AlertTriangle className="w-4 h-4" />
              The Bottom Line
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900">
              The Only SEO Worth Doing Has Changed
            </h3>
            
            <p className="text-lg text-gray-700">
              While AI kills top-funnel traffic, bottom-funnel content still drives real visitors. Alternative comparisons and category reviews are the new goldmine.
            </p>

            <div className="pt-4">
              <p className="text-gray-600 font-medium">
                Smart brands are shifting focus to where traffic still converts.<br/>
                <span className="text-xl text-red-600 font-bold">Is your SEO stuck in the past?</span>
              </p>
            </div>
          </div>
        </div>

        {/* Transition to Solution */}
        <div className="text-center mt-12">
          <p className="text-lg text-gray-600">
            There's a smarter way to do SEO in 2025...
          </p>
          <div className="flex justify-center mt-4">
            <div className="w-1 h-16 bg-gradient-to-b from-gray-300 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
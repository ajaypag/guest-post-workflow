'use client';

import { 
  TrendingDown,
  Search,
  FileText,
  DollarSign,
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
            The Content Marketing Playbook Has Been Turned Upside Down
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            The data doesn't lie. While everyone chases the same tired strategies, 
            the rules of the game have completely changed.
          </p>
        </div>

        {/* Problem Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
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
                  Informational content gets extracted by AI, not visited. 
                  88% of AI Overview queries are informational with a 77% zero-click rate.
                </p>
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <TrendingDown className="w-4 h-4" />
                  <span>Projected 70%+ zero-click by 2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* Problem 2: AI Scrapes Without Attribution */}
          <div className="bg-white rounded-xl p-6 border border-red-100 hover:border-red-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-lg">
                  AI Scrapes Content 179x More Than It Sends Traffic
                </h3>
                <p className="text-gray-600">
                  OpenAI scrapes 179 pages for every 1 visitor it sends back. 
                  Your content powers AI answers while you get nothing in return.
                </p>
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <XCircle className="w-4 h-4" />
                  <span>RAG scraping grew 49% in Q4 2024</span>
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
                  Yet everyone still chases top-funnel keywords. 
                  Bottom-funnel CPM is 35% higher because buyers pay more for purchase-ready audiences.
                </p>
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Wasting budget on wrong funnel stage</span>
                </div>
              </div>
            </div>
          </div>

          {/* Problem 4: AI Traffic Hype */}
          <div className="bg-white rounded-xl p-6 border border-red-100 hover:border-red-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Only 1% of B2B SaaS Traffic Comes From AI
                </h3>
                <p className="text-gray-600">
                  Despite all the hype about AI changing everything, B2B SaaS sites get just 0.2%-1.02% traffic from AI platforms. 
                  Product pages get less than 0.5%.
                </p>
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <DollarSign className="w-4 h-4" />
                  <span>Chasing overhyped opportunity</span>
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
              While You Chase Traffic, Buyers Moved to Comparison Research
            </h3>
            
            <p className="text-lg text-gray-700">
              The data is clear: informational content is on life support, AI extracts without attribution, 
              bottom-funnel converts better, yet everyone optimizes for the wrong metrics.
            </p>

            <div className="pt-4">
              <p className="text-gray-600 font-medium">
                There are probably just 10 prompt variations that actually matter for your business.<br/>
                <span className="text-xl text-red-600 font-bold">Are you showing up in any of them?</span>
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
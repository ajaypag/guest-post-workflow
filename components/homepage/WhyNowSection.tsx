'use client';

import { 
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  Target,
  Brain,
  ArrowRight,
  Calendar,
  Zap
} from 'lucide-react';

export default function WhyNowSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-red-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium mb-6">
            <Clock className="w-4 h-4" />
            THE WINDOW IS CLOSING
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Every Day You Wait, Competitors Claim More Territory
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            The shift to bottom-funnel SEO is happening now. 
            Those who move first will own their categories for years.
          </p>
        </div>

        {/* Three Urgency Points */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          
          {/* Competitive Gap */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-100">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Most Are Still Playing Old School
            </h3>
            
            <p className="text-gray-600 mb-4">
              People are just starting to pick up on bottom-funnel SEO, but most companies 
              are still doing traditional content marketing instead of strategic placement.
            </p>
            
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-red-900">The opportunity:</div>
                  <div className="text-sm text-red-700 mt-1">
                    While others chase vanity metrics, you can own buyer searches
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Search Growth */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-orange-100">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-orange-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              AI Search Is Exploding
            </h3>
            
            <p className="text-gray-600 mb-4">
              ChatGPT hit 800M weekly users in 2024, growing 4x year-over-year. 
              Google's search share dropped below 90% for the first time since 2015.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-700">ChatGPT Weekly Users</span>
                <span className="text-sm font-bold text-orange-600">800M+</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-700">Google's Market Share</span>
                <span className="text-sm font-bold text-orange-600">89.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-700">AI Search Growth</span>
                <span className="text-sm font-bold text-green-600">374x in 2024</span>
              </div>
            </div>
          </div>

          {/* First Mover Advantage */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-yellow-100">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-yellow-700" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              The Snowball Effect
            </h3>
            
            <p className="text-gray-600 mb-4">
              Once you get into these mentions, you keep getting into other mentions. 
              It's a snowball effect - soon you can't turn your head without being mentioned.
            </p>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm font-semibold text-green-900 mb-2">
                How it compounds:
              </div>
              <ul className="space-y-1 text-sm text-green-700">
                <li>• One mention leads to more mentions</li>
                <li>• Writers reference existing comparisons</li>
                <li>• You become part of the conversation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Market Shift Visual */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white mb-12">
          <h3 className="text-2xl font-bold mb-6 text-center">
            Two Different Approaches
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Approach */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">✗</span>
                </div>
                <h4 className="text-lg font-semibold">Traditional Content Marketing</h4>
              </div>
              
              <div className="space-y-2 text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-red-400">→</span>
                  <span className="text-sm">Creating blog content for your own site</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">→</span>
                  <span className="text-sm">Hoping people find you organically</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">→</span>
                  <span className="text-sm">Competing against everyone else</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">→</span>
                  <span className="text-sm">Missing from comparison conversations</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-700">
                <div className="text-2xl font-bold text-red-400">Hard Way</div>
              </div>
            </div>
            
            {/* Strategic Approach */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">✓</span>
                </div>
                <h4 className="text-lg font-semibold">Strategic Placement</h4>
              </div>
              
              <div className="space-y-2 text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span className="text-sm">Getting featured where buyers research</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span className="text-sm">Appearing in comparison content</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span className="text-sm">Building mention momentum</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span className="text-sm">Present when decisions are made</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-700">
                <div className="text-2xl font-bold text-green-400">Smart Way</div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-lg text-gray-300 mb-2">Which approach makes more sense?</p>
            <p className="text-sm text-gray-400">The choice is yours.</p>
          </div>
        </div>

        {/* Limited Spots */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-orange-300 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            LIMITED OPPORTUNITY
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Start Your Snowball Now
          </h3>
          
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            While most companies are still doing traditional content marketing, 
            you can get ahead and start building your mention momentum.
          </p>
          
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">Early</div>
              <div className="text-sm text-gray-600">Market stage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">Most</div>
              <div className="text-sm text-gray-600">Still doing old SEO</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">Perfect</div>
              <div className="text-sm text-gray-600">Time to start</div>
            </div>
          </div>
          
          <button
            onClick={() => {
              const heroForm = document.querySelector('#hero-form');
              if (heroForm) {
                heroForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg"
          >
            <Calendar className="w-5 h-5" />
            Get Started Now - See Your First Opportunities
          </button>
        </div>
      </div>
    </section>
  );
}
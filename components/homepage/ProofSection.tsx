'use client';

import { 
  TrendingUp,
  Target,
  Clock,
  Award,
  ArrowRight,
  BarChart3,
  Search,
  Users,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function ProofSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Real Results From Real Companies
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Not percentages and promises. Actual search queries, actual placements, actual revenue impact.
          </p>
        </div>

        {/* Featured Case Studies */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Case Study 1: Square Foot Homes */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden group hover:shadow-xl transition-all">
            <div className="h-2 bg-gradient-to-r from-green-600 to-teal-600" />
            
            <div className="p-8">
              {/* Company & Industry */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Square Foot Homes</h3>
                  <p className="text-sm text-gray-600">Real Estate • Florida</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Live Case
                </div>
              </div>

              {/* The Challenge */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  The Challenge
                </h4>
                <p className="text-gray-600">
                  Local real estate company competing against national brands for Florida searches
                </p>
              </div>

              {/* The Results */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Results in 15 Months
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">10</div>
                    <div className="text-xs text-gray-600">Strategic guides</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">1,500+</div>
                    <div className="text-xs text-gray-600">Keywords ranking</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">+243%</div>
                    <div className="text-xs text-gray-600">Organic traffic</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">686</div>
                    <div className="text-xs text-gray-600">Monthly visitors</div>
                  </div>
                </div>
                
                {/* Specific Wins */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">
                      #1 for "55 condos for sale in jupiter florida"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">
                      #7 for "homes for sale boca raton" (900 searches/mo)
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link 
                href="/case-studies/squarefoothomes"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium group"
              >
                Read Full Case Study
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Case Study 2: OutreachLabs */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden group hover:shadow-xl transition-all">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
            
            <div className="p-8">
              {/* Company & Industry */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">OutreachLabs</h3>
                  <p className="text-sm text-gray-600">B2B Link Building Agency</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Live Case
                </div>
              </div>

              {/* The Challenge */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  The Challenge
                </h4>
                <p className="text-gray-600">
                  Establish authority in competitive B2B link building space with strategic placements
                </p>
              </div>

              {/* The Results */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Results from 4 Posts
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">4</div>
                    <div className="text-xs text-gray-600">Strategic posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">97</div>
                    <div className="text-xs text-gray-600">Keywords ranking</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">#2</div>
                    <div className="text-xs text-gray-600">Best position</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">251+</div>
                    <div className="text-xs text-gray-600">Monthly traffic</div>
                  </div>
                </div>
                
                {/* Specific Wins */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">
                      #3 for "white hat link building agency"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">
                      #7 for "local seo resellers" (350 searches/mo)
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link 
                href="/case-studies/outreachlabs"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium group"
              >
                Read Full Case Study
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Why These Results Matter */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-12 border border-blue-200">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Why These Results Matter
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              These aren't vanity metrics. Every ranking shown drives qualified buyers who are actively 
              researching solutions, not random visitors browsing blog posts.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 mb-2">Square Foot Homes Strategy:</h4>
                <p className="text-gray-600 text-sm">
                  Local guides on national outlets solved the impossible: getting quality backlinks 
                  to location-specific real estate pages. Results: 243% traffic growth.
                </p>
              </div>
              
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 mb-2">OutreachLabs Strategy:</h4>
                <p className="text-gray-600 text-sm">
                  Strategic placement over volume. Just 4 guest posts generated 97 keyword rankings 
                  by targeting sites with existing topical authority.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-6">
            Every result above is verifiable. No fluff, no percentages without context.
          </p>
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <BarChart3 className="w-5 h-5" />
            View All Case Studies
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
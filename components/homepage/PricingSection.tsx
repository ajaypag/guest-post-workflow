'use client';

import { 
  DollarSign,
  CheckCircle,
  Calculator,
  TrendingDown,
  Shield,
  Clock,
  Star,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

export default function PricingSection() {
  const serviceFee = SERVICE_FEE_CENTS / 100; // Convert cents to dollars

  return (
    <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            NO HIDDEN FEES • TRANSPARENT PRICING
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Simple, Honest Pricing
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            You pay exactly what the publisher charges + our ${serviceFee} service fee. 
            No markups, no hidden costs, no surprises.
          </p>
        </div>

        {/* Main Pricing Card */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white rounded-3xl shadow-xl border-2 border-blue-200 p-8 md:p-12">
            {/* Pricing Formula */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                How Our Pricing Works
              </h3>
              
              <div className="flex items-center justify-center gap-4 text-2xl font-bold mb-6">
                <div className="bg-blue-100 px-4 py-2 rounded-lg text-blue-900">
                  Publisher Cost
                </div>
                <span className="text-gray-400">+</span>
                <div className="bg-green-100 px-4 py-2 rounded-lg text-green-900">
                  ${serviceFee}
                </div>
                <span className="text-gray-400">=</span>
                <div className="bg-purple-100 px-4 py-2 rounded-lg text-purple-900">
                  Your Price
                </div>
              </div>
              
              <p className="text-gray-600 max-w-2xl mx-auto">
                That's it. No agency markups, no hidden fees, no complexity. 
                Just transparent, fair pricing on every placement.
              </p>
            </div>

            {/* What's Included */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Publisher Cost (Variable)
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    <span>Direct publisher pricing (wholesale rates)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    <span>Varies by opportunity and site relevance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    <span>You see exact cost before approving</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  ${serviceFee} Service Fee (Fixed)
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Professional content creation (2-3K words)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>SEO optimization & keyword integration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Deep product intelligence research</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>AI-friendly content structure for citations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Publisher outreach & placement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Quality assurance & publication monitoring</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Example Pricing */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-600" />
                Real Examples
              </h4>
              
              <div className="bg-white rounded-lg p-6 text-center border-2 border-blue-300">
                <div className="text-lg font-semibold text-gray-900 mb-2">Opportunity-Based Pricing</div>
                <div className="text-sm text-gray-600 mb-4">
                  Each placement is priced based on the strategic value and opportunity it represents
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  Publisher Cost + ${serviceFee}
                </div>
                <div className="text-sm text-gray-500">
                  We find the opportunity, you decide if it's worth it
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                * Each opportunity is evaluated individually. You approve every placement.
              </p>
            </div>
          </div>
        </div>

        {/* Why This Is Better */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Traditional Agency */}
          <div className="bg-red-50 rounded-2xl p-8 border border-red-200">
            <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-6 h-6" />
              Traditional Agency Model
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-900">Opaque Pricing</div>
                  <div className="text-sm text-red-700">You don't see actual publisher costs</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-900">Package Deals</div>
                  <div className="text-sm text-red-700">Pay for sites that might not fit</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-900">Less Control</div>
                  <div className="text-sm text-red-700">Limited visibility into individual opportunities</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-red-100 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-800">Mixed</div>
                <div className="text-sm text-red-700">Results vary by approach</div>
              </div>
            </div>
          </div>

          {/* Our Model */}
          <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
            <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Our Transparent Model
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-900">Full Transparency</div>
                  <div className="text-sm text-green-700">See exact publisher cost for every site</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-900">À La Carte</div>
                  <div className="text-sm text-green-700">Pay only for sites you approve</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-900">Your Choice</div>
                  <div className="text-sm text-green-700">Approve or reject every placement</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-100 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-800">Opportunity-Based</div>
                <div className="text-sm text-green-700">Start with opportunities that make sense</div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">
            No Contracts, No Minimums, No BS
          </h3>
          
          <p className="text-lg mb-6 text-blue-100 max-w-2xl mx-auto">
            Start with one placement. See the results. Scale when you're ready. 
            You're always in control.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-400" />
              <span>Get started today</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span>Approve every site</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-green-400" />
              <span>Transparent process</span>
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors">
            See Sites & Pricing
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </section>
  );
}
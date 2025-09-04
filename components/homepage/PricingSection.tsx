'use client';

import { 
  CheckCircle,
  Shield,
  ArrowRight
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
            TRANSPARENT PRICING
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Simple, Honest Pricing
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            You see exact costs upfront and approve each placement. Publisher cost + ${serviceFee} service fee.
          </p>
        </div>

        {/* Main Pricing Card */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-3xl shadow-xl border-2 border-blue-200 p-8 md:p-12">
            {/* Pricing Formula */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                How It Works
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
            </div>

            {/* What You Get */}
            <div className="grid md:grid-cols-2 gap-8 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">
                  Publisher Cost (Variable)
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Direct publisher rates</li>
                  <li>• You see exact cost before approving</li>
                  <li>• Pay only for sites you choose</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">
                  ${serviceFee} Service Fee Includes
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Professional content creation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>SEO optimization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Publisher outreach & placement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Quality assurance</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center border-t pt-6">
              <p className="text-sm text-gray-500">
                Each opportunity evaluated individually. You approve every placement.
              </p>
            </div>
          </div>
        </div>

        {/* Key Differentiator */}
        <div className="max-w-3xl mx-auto mb-12 text-center">
          <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
            <h3 className="text-xl font-bold text-green-900 mb-4">
              The Key Difference
            </h3>
            <p className="text-green-700 mb-4">
              Unlike agencies that bundle placements into packages, you see each opportunity individually with exact costs upfront. Approve what makes sense, skip what doesn't.
            </p>
            <div className="text-2xl font-bold text-green-800">
              You're in control
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">
            Ready to Get Started?
          </h3>
          
          <p className="text-lg mb-6 text-blue-100 max-w-2xl mx-auto">
            Start with one placement. Scale when you're ready.
          </p>
          
          <button
            onClick={() => {
              const heroForm = document.getElementById('hero-form');
              if (heroForm) {
                heroForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
          >
            See Sites & Pricing
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
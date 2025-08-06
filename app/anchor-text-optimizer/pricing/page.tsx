'use client';

import { useState } from 'react';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';
import { 
  Check, 
  ArrowRight,
  Zap,
  Star,
  Shield,
  BarChart3,
  Target,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';

interface PricingTier {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  websites: number;
  backlinks: string;
  keywords: number;
  inboxes: number;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'PERSONAL',
    price: 19.99,
    period: 'per month',
    description: 'Perfect for individual SEOs and small sites',
    websites: 3,
    backlinks: '10,000',
    keywords: 150,
    inboxes: 1,
    features: [
      '3 Websites',
      '10,000 Backlinks Analyzed',
      '150 Keywords Tracked',
      'Anchor Text Suggestions',
      'Keyword Rank Tracking',
      'Backlink Monitoring',
      'SERP Competitor Analysis',
      'Unlimited Users',
      '1 Link Building Inbox'
    ],
    cta: 'Start Free Trial'
  },
  {
    name: 'STARTER',
    price: 49,
    period: 'per month',
    description: 'Great for growing agencies and multiple projects',
    websites: 10,
    backlinks: '40,000',
    keywords: 500,
    inboxes: 2,
    features: [
      '10 Websites',
      '40,000 Backlinks Analyzed',
      '500 Keywords Tracked',
      'Anchor Text Suggestions',
      'Keyword Rank Tracking',
      'Backlink Monitoring',
      'SERP Competitor Analysis',
      'Unlimited Users',
      '2 Link Building Inboxes'
    ],
    cta: 'Start Free Trial',
    highlighted: true
  },
  {
    name: 'STANDARD',
    price: 99,
    period: 'per month',
    description: 'Ideal for established agencies with multiple clients',
    websites: 25,
    backlinks: '100,000',
    keywords: 1200,
    inboxes: 4,
    features: [
      '25 Websites',
      '100,000 Backlinks Analyzed',
      '1,200 Keywords Tracked',
      'Anchor Text Suggestions',
      'Keyword Rank Tracking',
      'Backlink Monitoring',
      'SERP Competitor Analysis',
      'Unlimited Users',
      '4 Link Building Inboxes'
    ],
    cta: 'Start Free Trial'
  },
  {
    name: 'PLUS',
    price: 149,
    period: 'per month',
    description: 'Maximum power for serious link builders',
    websites: 50,
    backlinks: '200,000',
    keywords: 2200,
    inboxes: 6,
    features: [
      '50 Websites',
      '200,000 Backlinks Analyzed',
      '2,200 Keywords Tracked',
      'Anchor Text Suggestions',
      'Keyword Rank Tracking',
      'Backlink Monitoring',
      'SERP Competitor Analysis',
      'Unlimited Users',
      '6 Link Building Inboxes'
    ],
    cta: 'Start Free Trial'
  }
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const getAnnualPrice = (monthlyPrice: number) => {
    // Apply ~15% discount for annual billing
    return Math.round(monthlyPrice * 12 * 0.85);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader variant="default" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Start with a 7-day free trial. No credit card required.
            Scale up as your link building grows.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'monthly' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'annual' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual <span className="text-green-600 ml-1">Save 15%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
                  tier.highlighted ? 'ring-2 ring-blue-600 transform scale-105' : ''
                }`}
              >
                {tier.highlighted && (
                  <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      ${billingPeriod === 'monthly' ? tier.price : Math.round(tier.price * 0.85)}
                    </span>
                    <span className="text-gray-600 ml-2">
                      {billingPeriod === 'monthly' ? '/month' : '/month billed annually'}
                    </span>
                    {billingPeriod === 'annual' && (
                      <div className="text-sm text-green-600 mt-1">
                        ${getAnnualPrice(tier.price)} per year
                      </div>
                    )}
                  </div>
                  
                  <Link
                    href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      tier.highlighted 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  
                  <div className="mt-6 space-y-3">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Need more? Contact us for custom enterprise plans with unlimited everything.
            </p>
            <Link
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            All Plans Include These Core Features
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Anchor Text Optimization
              </h3>
              <p className="text-sm text-gray-600">
                Get specific anchor text suggestions based on what's working for top-ranking pages in your niche.
              </p>
            </div>
            
            <div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Real-Time Monitoring
              </h3>
              <p className="text-sm text-gray-600">
                Track new backlinks daily from Ahrefs, Moz, and other providers. Get alerts when ratios change.
              </p>
            </div>
            
            <div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                SERP Analysis
              </h3>
              <p className="text-sm text-gray-600">
                Compare your anchor text profile to competitors ranking above you and copy what works.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7-Day Free Trial, No Risk
            </h2>
            
            <p className="text-lg text-gray-600 mb-6">
              Try Linkio free for 7 days. No credit card required. 
              See how data-driven anchor text management can transform your link building.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Instant Setup</h3>
                <p className="text-sm text-gray-600">Connect your data sources and start optimizing in minutes</p>
              </div>
              
              <div>
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">No Credit Card</h3>
                <p className="text-sm text-gray-600">Start your trial without any payment information</p>
              </div>
              
              <div>
                <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Cancel Anytime</h3>
                <p className="text-sm text-gray-600">No contracts, no hassle, cancel with one click</p>
              </div>
            </div>
            
            <Link
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold mt-8"
            >
              Start Your Free Trial Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How does the free trial work?
              </h3>
              <p className="text-gray-600">
                Sign up without a credit card and get full access to all features for 7 days. 
                After the trial, choose a plan that fits your needs.
              </p>
            </div>
            
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! Upgrade or downgrade anytime. Changes take effect on your next billing cycle, 
                with prorated credits for any unused time.
              </p>
            </div>
            
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What's a "Link Building Inbox"?
              </h3>
              <p className="text-gray-600">
                Inboxes help you organize link building campaigns. Use different inboxes for 
                different clients, projects, or team members.
              </p>
            </div>
            
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you integrate with my existing tools?
              </h3>
              <p className="text-gray-600">
                Yes! We integrate with Ahrefs, Moz, Majestic, SEMrush, and more. 
                Import your backlink data automatically.
              </p>
            </div>
          </div>
          
          <div className="mt-12 p-6 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Still have questions?
                </h3>
                <p className="text-blue-700 text-sm">
                  Our support team is here to help. Start your free trial and experience 
                  our legendary customer support firsthand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Build Better Backlinks?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Join thousands of SEO professionals using data-driven anchor text strategies
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/anchor-text-optimizer"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 font-semibold transition-colors"
            >
              Try Our Free Tool
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, DollarSign, Globe, TrendingUp, Users, Star, Zap, BarChart3 } from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';

const benefits = [
  {
    icon: DollarSign,
    title: 'Earn Consistent Revenue',
    description: 'Get paid for quality guest posts on your website with transparent, competitive pricing.'
  },
  {
    icon: Globe,
    title: 'Global Network Access',
    description: 'Connect with hundreds of quality brands and content creators looking for placement.'
  },
  {
    icon: TrendingUp,
    title: 'Grow Your Authority',
    description: 'Build relationships with reputable brands while maintaining your editorial standards.'
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    description: 'Track your earnings, performance metrics, and optimize your content strategy.'
  }
];

const features = [
  'Set your own pricing and terms',
  'Review and approve all content before publishing',
  'Automated payment processing',
  'Dedicated publisher dashboard',
  'Quality assurance and support',
  'Performance tracking and analytics'
];

const stats = [
  { value: '2,500+', label: 'Active Publishers' },
  { value: '$2.4M+', label: 'Publisher Earnings' },
  { value: '98%', label: 'Payment Success Rate' },
  { value: '4.8/5', label: 'Average Rating' }
];

export default function PublisherLandingPage() {
  return (
    <>
      <LinkioHeader />
      
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-6">
                  <Zap className="w-4 h-4 mr-2" />
                  Join Our Publisher Network
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                  Monetize Your Website with 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Quality Guest Posts</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Turn your website into a revenue stream. Connect with premium brands, 
                  maintain editorial control, and get paid for hosting high-quality content.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/publisher/signup"
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-medium text-lg transition-colors flex items-center justify-center"
                  >
                    Start Earning Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 font-medium text-lg transition-colors text-center"
                  >
                    How It Works
                  </Link>
                </div>
                
                {/* Quick stats */}
                <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">Monthly Earnings</div>
                      <div className="text-xs text-gray-500">Average publisher</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">$2,400</div>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +15% from last month
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Guest Posts</span>
                      <span className="text-sm font-medium text-gray-900">12 published</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Avg. Price</span>
                      <span className="text-sm font-medium text-gray-900">$200/post</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="text-sm font-medium text-green-600">98%</span>
                    </div>
                  </div>
                </div>
                
                {/* Floating badges */}
                <div className="absolute -top-6 -right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg">
                  <Star className="w-6 h-6" fill="currentColor" />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-purple-600 text-white p-3 rounded-full shadow-lg">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Why Publishers Choose Linkio
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Join thousands of successful publishers who are monetizing their content 
                while maintaining complete editorial control.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                  Everything You Need to Succeed
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Our platform provides all the tools and support you need to maximize 
                  your revenue while maintaining the quality and integrity of your website.
                </p>
                
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8">
                  <Link
                    href="/publisher/signup"
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-medium transition-colors inline-flex items-center"
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 ml-3">Flexible Pricing</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Set your own rates based on your domain authority, traffic, and niche expertise.</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 ml-3">Quality Control</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Review and approve every piece of content before it goes live on your site.</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 ml-3">Analytics Dashboard</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Track performance, earnings, and optimize your content strategy with detailed insights.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Start Earning?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join our network of successful publishers and turn your website into a revenue-generating asset.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/publisher/signup"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 font-medium text-lg transition-colors inline-flex items-center justify-center"
              >
                Create Publisher Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="border border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-blue-600 font-medium text-lg transition-colors text-center"
              >
                Contact Sales
              </Link>
            </div>
            
            <div className="mt-8 text-sm text-blue-100">
              Already have an account? {' '}
              <Link href="/publisher/login" className="text-white hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
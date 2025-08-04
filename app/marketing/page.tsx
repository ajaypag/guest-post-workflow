'use client';

import { useEffect, useState } from 'react';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Search, 
  CheckCircle,
  Users,
  Building2,
  Zap,
  ArrowRight,
  Shield,
  Target,
  PenTool,
  Send,
  Star,
  BarChart3,
  Brain,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import InteractiveWorkflowDemo from '@/components/InteractiveWorkflowDemo';

interface Stats {
  totalSites: number;
  totalNiches: number;
}

export default function MarketingHomepage() {
  const [stats, setStats] = useState<Stats>({
    totalSites: 13000,
    totalNiches: 100
  });

  useEffect(() => {
    // Fetch stats on client side
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/marketing/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.warn('Could not fetch real-time stats:', error);
        // Keep default values
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">PostFlow</div>
                <div className="text-xs text-gray-500 -mt-1">AI-Assisted Link Building</div>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-6">
              <Link href="/guest-posting-sites" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Browse Sites
              </Link>
              <Link href="/account/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Sign In
              </Link>
              <Link 
                href="/signup/marketing" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Main Message */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
                <Brain className="w-4 h-4" />
                AI-Assisted, Human-Curated
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Strategic Link Building
                <span className="text-blue-600"> That Actually Works</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Expert curation meets AI efficiency. Wholesale pricing + transparent service fees. 
                Whether you're an agency, internal SEO team, or business owner - we deliver strategic links with proven results.
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Strategic topic overlap analysis for maximum relevance</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">White-label ready process for agencies & teams</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Complete service: research, writing, outreach & placement</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup/marketing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
                >
                  Start Your Campaign
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/guest-posting-sites"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
                >
                  <Eye className="w-5 h-5" />
                  Browse {stats.totalSites.toLocaleString()} Sites
                </Link>
              </div>
            </div>

            {/* Right: Stats Card */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Real Numbers, Real Results
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {stats.totalSites.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-600">Verified Sites</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">$79</div>
                  <div className="text-sm text-gray-600">Flat Service Fee</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {stats.totalNiches}+
                  </div>
                  <div className="text-sm text-gray-600">Active Niches</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">Dozens</div>
                  <div className="text-sm text-gray-600">Happy Clients</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Wholesale pricing available</strong> for agencies & bulk orders
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How We're Different */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why SEO Professionals Choose Us
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're an agency, internal team, or business owner - we deliver strategic link building based on data, not guesswork.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Traditional Approach */}
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                Traditional Approach
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">DR-Focused Selection</div>
                    <div className="text-sm text-gray-600">High authority numbers without topic relevance</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Generic Content</div>
                    <div className="text-sm text-gray-600">Template-based articles with forced placement</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Unclear Pricing</div>
                    <div className="text-sm text-gray-600">Hidden fees and variable markups</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 text-sm font-bold">−</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Limited Scalability</div>
                    <div className="text-sm text-gray-600">Manual processes that don't scale efficiently</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Our Approach */}
            <div className="bg-blue-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-blue-900 mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6" />
                PostFlow Method
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Strategic Topic Mapping</div>
                    <div className="text-sm text-blue-700">AI analyzes host site's authority clusters for natural content fit</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Research-Driven Content</div>
                    <div className="text-sm text-blue-700">2000-3000 word articles with genuine value and strategic placement</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Wholesale Pricing</div>
                    <div className="text-sm text-blue-700">Transparent costs perfect for agencies and internal teams</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Scalable Process</div>
                    <div className="text-sm text-blue-700">AI efficiency + human expertise scales with your needs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study Teaser */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Real Results, Not Vanity Metrics
          </h2>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border mb-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                <BarChart3 className="w-4 h-4" />
                Recent Win
              </div>
            </div>
            
            <blockquote className="text-lg text-gray-700 italic mb-6">
              "DR 71. 500 Traffic. Declining Graph. Most SEOs: 'Skip it - dead site.' 
              I strategically bought a guest post anyway. Published yesterday, already sitting on Page 1."
            </blockquote>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">Page 1</div>
                <div className="text-sm text-gray-600">Ranking in 24hrs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">1K</div>
                <div className="text-sm text-gray-600">Monthly searches</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">Topic</div>
                <div className="text-sm text-gray-600">Authority match</div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">
            <strong>The secret?</strong> We mapped the site's existing topical authority to our target keyword. 
            Traffic charts only tell half the story. Topic overlap tells the rest.
          </p>
          
          <Link
            href="https://www.outreachlabs.com/link-building-service/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Star className="w-5 h-5" />
            View More Case Studies
          </Link>
        </div>
      </section>

      {/* Interactive Workflow Demo */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              See Our Actual Process In Action
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This isn't marketing fluff - click through our actual production system. 
              Real AI prompts, database queries, and the technical architecture behind each step.
            </p>
          </div>

          <InteractiveWorkflowDemo />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready for Strategic Link Building?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Join dozens of agencies, SEO teams, and business owners getting quality links at wholesale pricing.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/marketing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-lg"
            >
              Start Your Campaign
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/guest-posting-sites"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors text-lg"
            >
              Browse Our Database
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">PostFlow</div>
                  <div className="text-xs text-gray-400">AI-Assisted Link Building</div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Strategic link building for SEO professionals and business owners. Expert curation meets AI efficiency.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-white mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/guest-posting-sites" className="hover:text-white">Guest Posting Sites</Link></li>
                <li><a href="https://www.outreachlabs.com/link-building-service/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Case Studies</a></li>
                <li><span className="text-gray-500">Bulk Discounts Available</span></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/account/login" className="hover:text-white">Sign In</Link></li>
                <li><Link href="/signup/marketing" className="hover:text-white">Get Started</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Get Started</h4>
              <p className="text-sm text-gray-400 mb-4">
                Ready to try strategic link building?
              </p>
              <Link
                href="/signup/marketing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              >
                Start Today
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">
              &copy; 2025 PostFlow. Strategic link building that scales.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';
import { 
  ArrowRight, 
  ChevronDown, 
  Users, 
  Target, 
  Brain, 
  CheckCircle,
  Sparkles,
  BarChart3,
  Search,
  FileText,
  Zap
} from 'lucide-react';

// Demo Components (we'll create these)
import ClientSetupDemo from '@/components/demo/ClientSetupDemo';
import MarketIntelligenceDemo from '@/components/demo/MarketIntelligenceDemo';
import KeywordDiscoveryDemo from '@/components/demo/KeywordDiscoveryDemo';
import AIAnalysisDemo from '@/components/demo/AIAnalysisDemo';
import SiteReviewDemo from '@/components/demo/SiteReviewDemo';
import ArticleGenerationDemo from '@/components/demo/ArticleGenerationDemo';

// Progress indicator for the workflow
const WorkflowProgress = ({ currentPhase }: { currentPhase: number }) => {
  const phases = [
    { id: 1, name: 'Client Setup', icon: Users },
    { id: 2, name: 'Market Intelligence', icon: Target },
    { id: 3, name: 'Keyword Discovery', icon: Search },
    { id: 4, name: 'AI Analysis', icon: Brain },
    { id: 5, name: 'Site Review', icon: CheckCircle },
    { id: 6, name: 'Content Creation', icon: FileText }
  ];

  return (
    <div className="fixed top-20 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center">
              <div className={`flex items-center ${currentPhase >= phase.id ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all
                  ${currentPhase >= phase.id ? 'bg-blue-100' : 'bg-gray-100'}
                `}>
                  <phase.icon className="w-5 h-5" />
                </div>
                <span className="ml-2 text-sm font-medium hidden md:inline">{phase.name}</span>
              </div>
              {index < phases.length - 1 && (
                <div className={`
                  mx-2 md:mx-4 h-0.5 w-8 md:w-16 transition-all
                  ${currentPhase > phase.id ? 'bg-blue-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Perspective indicator
const PerspectiveSwitch = ({ perspective }: { perspective: 'agency' | 'internal' }) => {
  return (
    <div className="py-16 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-lg">
          <Zap className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">
            {perspective === 'agency' ? "You're in Control" : "Our Expert Team Takes Over"}
          </span>
        </div>
        <p className="mt-4 text-gray-600">
          {perspective === 'agency' 
            ? "Configure exactly what you need with intuitive tools"
            : "Advanced AI and human expertise work behind the scenes"}
        </p>
      </div>
    </div>
  );
};

export default function HowItWorksPage() {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Track scroll position for progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = window.scrollY / totalHeight;
      setScrollProgress(progress);
      
      // Update current phase based on scroll position
      const phase = Math.min(6, Math.max(1, Math.floor(progress * 6) + 1));
      setCurrentPhase(phase);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />
      <WorkflowProgress currentPhase={currentPhase} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Interactive Workflow Walkthrough
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              See How Agencies Scale
              <span className="text-blue-600"> Premium Link Building</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Walk through our actual production system. Not mockups, not screenshots - 
              the real tools that power successful campaigns.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link 
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
              >
                Start Your Campaign
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors"
              >
                Explore the Workflow
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            
            {/* Key Stats */}
            <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-gray-900">5D</div>
                <div className="text-sm text-gray-600">AI Analysis Dimensions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">O3</div>
                <div className="text-sm text-gray-600">Reasoning Model</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">$79</div>
                <div className="text-sm text-gray-600">Cost Plus Pricing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 1: Client Setup */}
      <section id="phase-1" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                Phase 1: Agency Setup
              </div>
              
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Smart Client Setup with AI Intelligence
              </h2>
              
              <p className="text-lg text-gray-600 mb-8">
                Built for agencies managing multiple clients. Add your clients and their 
                target pages once, and our AI automatically extracts keywords, analyzes 
                page types, and understands content context.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Multi-Client Dashboard</div>
                    <div className="text-sm text-gray-600">Manage all your clients in one organized interface</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">AI-Powered Analysis</div>
                    <div className="text-sm text-gray-600">Automatic keyword extraction and page understanding</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Reusable Across Campaigns</div>
                    <div className="text-sm text-gray-600">Set up once, use for multiple orders</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl" />
              <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                <ClientSetupDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 2: Market Intelligence */}
      <section id="phase-2" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl" />
                <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                  <MarketIntelligenceDemo />
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                <Target className="w-4 h-4" />
                Phase 2: Your Standards
              </div>
              
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Define Your Version of Quality
              </h2>
              
              <p className="text-lg text-gray-600 mb-8">
                Everyone's got their own version of quality. Set YOUR budget, YOUR metrics, 
                YOUR standards. If it's possible and reasonable and our database has it, 
                that's what we'll deliver.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-6 h-6 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Real-Time Market Data</div>
                    <div className="text-sm text-gray-600">See exactly how many sites match your criteria</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-6 h-6 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Granular Control</div>
                    <div className="text-sm text-gray-600">Price ranges, DR, traffic, categories, niches, types</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-6 h-6 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">No Judgment Approach</div>
                    <div className="text-sm text-gray-600">Some want DR 70+, others want perfect relevance - we deliver both</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Perspective Switch to Internal Team */}
      <PerspectiveSwitch perspective="internal" />

      {/* Phase 3: Keyword Discovery */}
      <section id="phase-3" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
              <Search className="w-4 h-4" />
              Phase 3: Deep Intelligence
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Two-Tier Keyword Discovery System
            </h2>
            
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We don't just check if sites rank for your exact keywords. We analyze their 
              entire keyword universe - thousands of data points - to find hidden relevance 
              and opportunities others miss.
            </p>
          </div>
          
          <KeywordDiscoveryDemo />
        </div>
      </section>

      {/* Phase 4: 5D AI Analysis */}
      <section id="phase-4" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              Phase 4: The Secret Sauce
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              5-Dimensional AI Analysis
              <span className="text-blue-600"> Others Don't Even Know Exists</span>
            </h2>
            
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              This isn't "high DR = good". This is contextual AI analysis using O3 reasoning 
              model. Every site gets analyzed across 5 sophisticated dimensions BEFORE you see it.
            </p>
          </div>
          
          <AIAnalysisDemo />
        </div>
      </section>

      {/* Perspective Switch Back to Agency */}
      <PerspectiveSwitch perspective="agency" />

      {/* Phase 5: Site Review */}
      <section id="phase-5" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              <CheckCircle className="w-4 h-4" />
              Phase 5: Your Decision
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Review Pre-Qualified Sites, Not Database Dumps
            </h2>
            
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              You only see sites that passed both AI and human qualification. Get granular with 
              each recommendation - see the evidence, understand the reasoning, make informed decisions.
            </p>
          </div>
          
          <SiteReviewDemo />
        </div>
      </section>

      {/* Phase 6: Article Generation - The Coup de Grâce */}
      <section id="phase-6" className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
              <FileText className="w-4 h-4" />
              Phase 6: The Coup de Grâce
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              V2 Article Generation with
              <span className="text-green-600"> O3 Reasoning</span>
            </h2>
            
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Watch as our AI builds articles section by section with advanced reasoning, 
              semantic SEO optimization, and perfect internal linking. This is the content 
              quality that gets results.
            </p>
          </div>
          
          <ArticleGenerationDemo />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Experience This Yourself?
          </h2>
          
          <p className="text-xl opacity-90 mb-8">
            Join agencies using sophisticated AI analysis and transparent pricing 
            to deliver premium guest posts at scale.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold text-lg transition-colors"
            >
              Start Your Campaign - $79
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/guest-posting-sites"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 font-semibold text-lg transition-colors"
            >
              Browse Our Database
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
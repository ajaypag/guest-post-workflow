'use client';

import { 
  ArrowRight,
  CheckCircle,
  Target,
  Clock,
  Shield,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

export default function FinalCTASection() {
  const scrollToHero = () => {
    const heroSection = document.querySelector('section');
    heroSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main CTA */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-400/90 text-green-900 rounded-full text-sm font-bold mb-8">
            <CheckCircle className="w-4 h-4" />
            START BUILDING YOUR MENTION MOMENTUM
          </div>
          
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
            Stop Being Invisible.<br />
            <span className="text-blue-300">Own Your Category.</span>
          </h2>
          
          <p className="text-xl lg:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            While your competitors scramble for vanity metrics, you'll dominate every comparison search in your niche. 
            The window is closing. The time is now.
          </p>

          <div className="flex flex-col lg:flex-row gap-6 justify-center items-center mb-12">
            <button
              onClick={scrollToHero}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-xl"
            >
              <Target className="w-6 h-6" />
              Get Your Competition Analysis
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="text-center lg:text-left">
              <div className="text-sm text-blue-200 font-medium">Free Analysis • No Credit Card</div>
              <div className="text-xs text-blue-300">See who owns your category's buyer searches</div>
            </div>
          </div>
        </div>

        {/* Final Value Props */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
            <Clock className="w-8 h-8 text-green-400 mx-auto mb-4" />
            <h3 className="font-bold text-white mb-2">Fast Results</h3>
            <p className="text-blue-100 text-sm">Show up in comparisons within weeks, not months</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
            <Shield className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <h3 className="font-bold text-white mb-2">Zero Risk</h3>
            <p className="text-blue-100 text-sm">60-day guarantee. See sites before you pay.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
            <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <h3 className="font-bold text-white mb-2">Proven System</h3>
            <p className="text-blue-100 text-sm">Growing database of vetted sites</p>
          </div>
        </div>

        {/* Value Props Strip */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-12">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-white mb-1">No Contracts</div>
              <div className="text-sm text-blue-200">Start with one placement</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">Transparent</div>
              <div className="text-sm text-blue-200">See all costs upfront</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">Your Choice</div>
              <div className="text-sm text-blue-200">Approve every placement</div>
            </div>
          </div>
        </div>

        {/* Urgency Reminder */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-2xl p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-400/90 text-red-900 rounded-full text-sm font-bold mb-4">
            <Zap className="w-4 h-4" />
            LIMITED OPPORTUNITY
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-3">
            Every Day You Wait, Competitors Claim More Territory
          </h3>
          
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            The best opportunities go to the first movers. While others are still doing traditional SEO, 
            you can start building your mention momentum.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={scrollToHero}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              <Users className="w-5 h-5" />
              Claim Your Spot Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="text-sm text-blue-200">
              Or watch competitors take your place
            </div>
          </div>
        </div>

        {/* Bottom Guarantee */}
        <div className="text-center mt-12">
          <p className="text-blue-200 text-sm">
            <Shield className="w-4 h-4 inline mr-1" />
            60-day money-back guarantee • No contracts • Start with one placement
          </p>
        </div>
      </div>
    </section>
  );
}
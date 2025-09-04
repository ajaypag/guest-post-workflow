'use client';

import { 
  CheckCircle,
  Bot,
  Users,
  TrendingUp,
  Target
} from 'lucide-react';
import VettedSitesLeadForm from '@/components/VettedSitesLeadForm';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

export default function HeroSection() {
  const serviceFee = SERVICE_FEE_CENTS / 100;
  
  return (
    <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 py-12 md:py-16 lg:py-20 min-h-[85vh] flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* Left: Value Proposition */}
          <div className="lg:pr-4 xl:pr-8">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/90 text-white rounded-full text-sm font-bold mb-8 shadow-lg border border-green-400/30">
                <Target className="w-4 h-4" />
                BUILT FOR THE ZERO-CLICK ERA
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 lg:mb-8 leading-tight">
                Future-Looking Link Building<br />
                <span className="text-blue-300">on Topic-Relevant Sites</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-200 leading-relaxed mb-6">
                We create 2–3K-word, bottom-funnel content on publishers with real topical relevance—editorially justifiable and built to rank. <strong className="text-white">You approve each site. We secure the links.</strong>
              </p>

              <div className="bg-blue-800/30 border border-blue-400/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-100 mb-2">
                  <strong>How it works:</strong> Find sites with topical overlap → Create bottom-funnel content → Secure strategic placements.
                </p>
                <p className="text-xs text-blue-200">
                  We handle everything: Publisher cost + ${serviceFee} per placement. You approve each opportunity.
                </p>
              </div>

            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:pl-8">
            <VettedSitesLeadForm />
          </div>
        </div>
      </div>
    </section>
  );
}
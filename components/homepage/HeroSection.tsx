'use client';

import { 
  CheckCircle,
  Bot,
  Users
} from 'lucide-react';
import VettedSitesLeadForm from '@/components/VettedSitesLeadForm';

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 py-12 md:py-16 lg:py-20 min-h-[85vh] flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* Left: Value Proposition */}
          <div className="lg:pr-4 xl:pr-8">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-400/90 text-white rounded-full text-sm font-bold mb-8 shadow-lg border border-blue-300/30">
                <CheckCircle className="w-4 h-4" />
                KEYWORD-MATCHED SITES, NOT RANDOM HIGH-DR SPAM
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 lg:mb-8 leading-tight">
                Own Every Best Of Search<br />
                <span className="text-blue-300">in Your Category</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-200 leading-relaxed mb-6 lg:mb-8">
                Instead of backlinks from random high DR sites, we find websites that already rank for <strong className="text-white">your exact keywords</strong>—getting you AI citations while building traditional SEO rankings.
              </p>

              <div className="flex flex-wrap items-center gap-4 lg:gap-8">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-blue-300 flex items-center justify-center gap-1">
                    <Bot className="w-6 h-6" />+<Users className="w-6 h-6" />
                  </div>
                  <div className="text-xs lg:text-sm text-slate-300">Curation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-blue-300">Cost+</div>
                  <div className="text-xs lg:text-sm text-slate-300">$79 admin fee</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-blue-300">Done</div>
                  <div className="text-xs lg:text-sm text-slate-300">For You</div>
                </div>
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
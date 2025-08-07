'use client';

import { useState } from 'react';
import { Search, Database, Sparkles, TrendingUp, Target } from 'lucide-react';

export default function KeywordDiscoveryDemo() {
  const [analyzing, setAnalyzing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'fetching' | 'matching' | 'complete'>('idle');

  const startAnalysis = () => {
    setAnalyzing(true);
    setPhase('fetching');
    
    setTimeout(() => setPhase('matching'), 1500);
    setTimeout(() => {
      setPhase('complete');
      setAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <button 
              onClick={startAnalysis}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Search className="w-5 h-5" />
              {analyzing ? 'Analyzing...' : 'Start Deep Analysis'}
            </button>
          </div>

          {/* Analysis Phases */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-lg border-2 transition-all ${
              phase === 'fetching' ? 'border-blue-500 bg-blue-50' : 
              phase === 'complete' ? 'border-green-500 bg-green-50' : 
              'border-gray-200'
            }`}>
              <Database className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">DataForSEO Analysis</h4>
              <p className="text-sm text-gray-600 mb-3">
                Pulling ALL ranking keywords (positions 1-100) for each domain
              </p>
              {phase === 'complete' && (
                <div className="text-sm font-semibold text-green-600">
                  ✓ 3,847 keywords found
                </div>
              )}
            </div>

            <div className={`p-6 rounded-lg border-2 transition-all ${
              phase === 'matching' ? 'border-blue-500 bg-blue-50' : 
              phase === 'complete' ? 'border-green-500 bg-green-50' : 
              'border-gray-200'
            }`}>
              <Target className="w-8 h-8 text-purple-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Keyword Matching</h4>
              <p className="text-sm text-gray-600 mb-3">
                Comparing against client's niche keywords (specific to broad)
              </p>
              {phase === 'complete' && (
                <div className="text-sm font-semibold text-green-600">
                  ✓ 126 relevant matches
                </div>
              )}
            </div>

            <div className={`p-6 rounded-lg border-2 transition-all ${
              phase === 'complete' ? 'border-green-500 bg-green-50' : 
              'border-gray-200'
            }`}>
              <Sparkles className="w-8 h-8 text-green-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Hidden Opportunities</h4>
              <p className="text-sm text-gray-600 mb-3">
                Finding non-obvious but valuable topical matches
              </p>
              {phase === 'complete' && (
                <div className="text-sm font-semibold text-green-600">
                  ✓ 42 opportunities found
                </div>
              )}
            </div>
          </div>

          {phase === 'complete' && (
            <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-900">
                  Analysis Complete: This site has strong topical relevance
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  168 total matching keywords across direct and related topics
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
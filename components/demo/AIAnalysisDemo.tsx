'use client';

import { useState } from 'react';
import { Brain, Target, TrendingUp, Activity, FileText, ChevronRight } from 'lucide-react';

const dimensions = [
  {
    id: 'overlap',
    name: 'Topical Overlap',
    icon: Target,
    color: 'purple',
    values: ['Direct', 'Related', 'Both', 'None'],
    description: 'Does the site rank for your specific or related keywords?'
  },
  {
    id: 'direct-auth',
    name: 'Direct Authority',
    icon: TrendingUp,
    color: 'green',
    values: ['Strong (1-30)', 'Moderate (31-60)', 'Weak (61-100)', 'N/A'],
    description: 'How well does it rank for your exact keywords?'
  },
  {
    id: 'related-auth',
    name: 'Related Authority', 
    icon: Activity,
    color: 'blue',
    values: ['Strong', 'Moderate', 'Weak', 'N/A'],
    description: 'Industry authority even without exact matches'
  },
  {
    id: 'scope',
    name: 'Topic Scope',
    icon: FileText,
    color: 'indigo',
    values: ['Short Tail', 'Long Tail', 'Ultra Long Tail'],
    description: 'What type of keywords can this site rank for?'
  },
  {
    id: 'evidence',
    name: 'Evidence & Reasoning',
    icon: Brain,
    color: 'amber',
    values: ['Full audit trail with keyword positions'],
    description: 'Concrete data backing every qualification'
  }
];

export default function AIAnalysisDemo() {
  const [analyzing, setAnalyzing] = useState(false);
  const [currentDimension, setCurrentDimension] = useState(0);
  const [results, setResults] = useState<Record<string, string>>({});

  const runAnalysis = () => {
    setAnalyzing(true);
    setCurrentDimension(0);
    setResults({});

    // Simulate analyzing each dimension
    const analyzeNext = (index: number) => {
      if (index >= dimensions.length) {
        setAnalyzing(false);
        return;
      }

      setCurrentDimension(index);
      
      setTimeout(() => {
        const mockResults: Record<string, string> = {
          'overlap': 'Both',
          'direct-auth': 'Strong (1-30)',
          'related-auth': 'Moderate',
          'scope': 'Long Tail',
          'evidence': '42 direct matches, median position: 18'
        };
        
        setResults(prev => ({
          ...prev,
          [dimensions[index].id]: mockResults[dimensions[index].id]
        }));
        
        analyzeNext(index + 1);
      }, 800);
    };

    analyzeNext(0);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      amber: 'bg-amber-100 text-amber-700 border-amber-300'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-8">
          {/* Analysis Button */}
          <div className="text-center mb-8">
            <button 
              onClick={runAnalysis}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
            >
              <Brain className="w-5 h-5" />
              {analyzing ? 'O3 Model Analyzing...' : 'Run 5D AI Analysis'}
            </button>
          </div>

          {/* Dimensions Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dimensions.map((dimension, index) => {
              const Icon = dimension.icon;
              const isActive = analyzing && currentDimension === index;
              const hasResult = results[dimension.id];
              
              return (
                <div 
                  key={dimension.id}
                  className={`
                    p-6 rounded-lg border-2 transition-all
                    ${isActive ? 'border-blue-500 bg-blue-50 scale-105' : 
                      hasResult ? 'border-green-500 bg-green-50' : 
                      'border-gray-200'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${hasResult ? getColorClasses(dimension.color) : 'bg-gray-100'}
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {dimension.name}
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        {dimension.description}
                      </p>
                      
                      {hasResult && (
                        <div className={`
                          inline-block px-3 py-1 rounded-full text-xs font-semibold
                          ${dimension.id === 'overlap' && results[dimension.id] === 'Both' ? 'bg-purple-600 text-white' :
                            dimension.id === 'direct-auth' && results[dimension.id].includes('Strong') ? 'bg-green-600 text-white' :
                            'bg-gray-200 text-gray-800'}
                        `}>
                          {results[dimension.id]}
                        </div>
                      )}
                      
                      {isActive && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="text-xs text-blue-600 font-medium">Analyzing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Final Verdict */}
          {Object.keys(results).length === dimensions.length && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">AI Verdict: High Quality</h3>
                      <p className="text-sm text-gray-600">
                        Direct overlap + Strong authority = Perfect match for your targets
                      </p>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
              
              <div className="mt-4 p-3 bg-white/80 rounded border border-gray-200">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">Reasoning:</span> This site ranks positions 1-30 for 
                  42 of your direct keywords and positions 31-60 for 84 related industry terms. 
                  Strong topical authority with ability to rank for long-tail variations. 
                  Recommended approach: Use geo or buyer-type modifiers for optimal results.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Callout */}
      <div className="mt-8 p-6 bg-gray-900 text-white rounded-lg">
        <h3 className="text-lg font-bold mb-2">Other Services vs. Our Approach</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-red-400 font-medium mb-2">❌ Generic Services</div>
            <p className="text-sm text-gray-400">
              "Here's 500 high DR sites, figure out which ones are relevant"
            </p>
          </div>
          <div>
            <div className="text-green-400 font-medium mb-2">✓ Our 5D Analysis</div>
            <p className="text-sm text-gray-400">
              "Here are 50 pre-qualified sites that match YOUR specific targets"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
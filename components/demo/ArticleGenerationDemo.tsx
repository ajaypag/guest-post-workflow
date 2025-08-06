'use client';

import { useState } from 'react';
import { FileText, Brain, Sparkles, CheckCircle, ArrowRight, Zap } from 'lucide-react';

const sections = [
  { id: 'intro', title: 'Introduction', status: 'pending', wordCount: 0 },
  { id: 'overview', title: 'Technology Overview', status: 'pending', wordCount: 0 },
  { id: 'benefits', title: 'Key Benefits', status: 'pending', wordCount: 0 },
  { id: 'implementation', title: 'Implementation Guide', status: 'pending', wordCount: 0 },
  { id: 'best-practices', title: 'Best Practices', status: 'pending', wordCount: 0 },
  { id: 'case-studies', title: 'Case Studies', status: 'pending', wordCount: 0 },
  { id: 'conclusion', title: 'Conclusion', status: 'pending', wordCount: 0 }
];

export default function ArticleGenerationDemo() {
  const [generating, setGenerating] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [articleSections, setArticleSections] = useState(sections);
  const [phase, setPhase] = useState<'idle' | 'researching' | 'writing' | 'optimizing' | 'complete'>('idle');

  const startGeneration = () => {
    setGenerating(true);
    setPhase('researching');
    setCurrentSection(0);
    setArticleSections(sections);

    // Simulate research phase
    setTimeout(() => {
      setPhase('writing');
      generateNextSection(0);
    }, 2000);
  };

  const generateNextSection = (index: number) => {
    if (index >= sections.length) {
      setPhase('optimizing');
      setTimeout(() => {
        setPhase('complete');
        setGenerating(false);
      }, 2000);
      return;
    }

    setCurrentSection(index);
    setArticleSections(prev => prev.map((section, i) => 
      i === index ? { ...section, status: 'generating' } : section
    ));

    setTimeout(() => {
      const wordCount = 250 + Math.floor(Math.random() * 150);
      setArticleSections(prev => prev.map((section, i) => 
        i === index ? { ...section, status: 'complete', wordCount } : section
      ));
      generateNextSection(index + 1);
    }, 1500);
  };

  const totalWords = articleSections.reduce((sum, section) => sum + section.wordCount, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <button 
              onClick={startGeneration}
              disabled={generating}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all"
            >
              <Brain className="w-6 h-6" />
              {generating ? 'O3 Model Generating...' : 'Generate Article with V2 System'}
            </button>
          </div>

          {/* Generation Phases */}
          {phase !== 'idle' && (
            <div className="mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className={`
                  flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
                  ${phase === 'researching' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}
                `}>
                  <Sparkles className="w-4 h-4" />
                  Deep Research
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className={`
                  flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
                  ${phase === 'writing' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}
                `}>
                  <FileText className="w-4 h-4" />
                  Section Writing
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className={`
                  flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
                  ${phase === 'optimizing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}
                `}>
                  <Zap className="w-4 h-4" />
                  SEO Optimization
                </div>
              </div>

              {phase === 'researching' && (
                <div className="text-center text-sm text-gray-600">
                  Analyzing SERPs, trends, and competitor content...
                </div>
              )}
              {phase === 'optimizing' && (
                <div className="text-center text-sm text-gray-600">
                  Adding semantic SEO, internal links, and final polish...
                </div>
              )}
            </div>
          )}

          {/* Section Progress */}
          <div className="space-y-3 mb-8">
            {articleSections.map((section, index) => (
              <div 
                key={section.id}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${section.status === 'generating' ? 'border-blue-500 bg-blue-50' : 
                    section.status === 'complete' ? 'border-green-500 bg-green-50' : 
                    'border-gray-200'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {section.status === 'complete' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : section.status === 'generating' ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className={`
                      font-medium
                      ${section.status === 'complete' ? 'text-gray-900' : 
                        section.status === 'generating' ? 'text-blue-700' : 
                        'text-gray-500'}
                    `}>
                      {section.title}
                    </span>
                  </div>
                  
                  {section.wordCount > 0 && (
                    <span className="text-sm text-gray-600">
                      {section.wordCount} words
                    </span>
                  )}
                </div>
                
                {section.status === 'generating' && (
                  <div className="mt-2 ml-8">
                    <div className="text-xs text-blue-600">
                      O3 reasoning: Building narrative flow, incorporating research...
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stats */}
          {totalWords > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalWords}</div>
                <div className="text-xs text-gray-600">Total Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {articleSections.filter(s => s.status === 'complete').length}/{articleSections.length}
                </div>
                <div className="text-xs text-gray-600">Sections Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">98</div>
                <div className="text-xs text-gray-600">SEO Score</div>
              </div>
            </div>
          )}

          {/* Complete Message */}
          {phase === 'complete' && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Article Generation Complete!</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {totalWords} words • Semantic SEO optimized • Internal links added • Ready to publish
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white/80 rounded border border-gray-200">
                <div className="text-xs text-gray-700 space-y-1">
                  <div>✓ Deep research completed with trend analysis</div>
                  <div>✓ Each section built with O3 reasoning for narrative flow</div>
                  <div>✓ Semantic SEO and entity optimization applied</div>
                  <div>✓ Internal links naturally incorporated</div>
                  <div>✓ Final polish for brand voice consistency</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* What Makes This Special */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-900 to-blue-900 text-white rounded-lg">
        <h3 className="text-lg font-bold mb-4">The Coup de Grâce: V2 Article Generation</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Traditional Approach</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• Single prompt to GPT</li>
              <li>• Generic templates</li>
              <li>• Basic keyword stuffing</li>
              <li>• Manual optimization needed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Our V2 System</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• Section-by-section with O3 reasoning</li>
              <li>• Dynamic outline from deep research</li>
              <li>• Semantic SEO built-in</li>
              <li>• ArticleEndCritic for quality assurance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
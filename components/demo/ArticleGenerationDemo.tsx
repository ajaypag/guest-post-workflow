'use client';

import { useState } from 'react';
import { 
  FileText, Brain, Sparkles, CheckCircle, ArrowRight, Zap, 
  Globe, Search, Lightbulb, BookOpen, Edit3, Target, 
  Link2, Image, Mail, TrendingUp, Award
} from 'lucide-react';

// The actual 17 workflow steps
const workflowSteps = [
  { 
    id: 'domain-selection', 
    title: 'Guest Post Site Selection', 
    icon: Globe,
    description: 'techinsights.io selected - DR 68, 45K traffic',
    status: 'pending'
  },
  { 
    id: 'keyword-research', 
    title: 'Site Qualification', 
    icon: Search,
    description: 'Finding topical overlap with client',
    status: 'pending'
  },
  { 
    id: 'topic-generation', 
    title: 'Topic Generation', 
    icon: Lightbulb,
    description: 'Generate topics that meet 3 criteria',
    detail: 'Topic selected: "10 Best AI Automation Platforms for Enterprise (2025)"',
    status: 'pending'
  },
  { 
    id: 'deep-research', 
    title: 'Deep Research & Outline', 
    icon: BookOpen,
    description: 'O3 Deep Research for comprehensive outline',
    detail: 'Analyzing SERPs, competitors, trends...',
    status: 'pending'
  },
  { 
    id: 'article-draft', 
    title: 'Article Draft', 
    icon: Edit3,
    description: 'Section-by-section writing with O3',
    detail: 'Creating listicle with client at #1 position',
    status: 'pending'
  },
  { 
    id: 'content-audit', 
    title: 'Semantic SEO Optimization', 
    icon: Target,
    description: 'Optimize for semantic search',
    status: 'pending'
  },
  { 
    id: 'final-polish', 
    title: 'Polish & Finalize', 
    icon: Sparkles,
    description: 'Brand voice and consistency check',
    status: 'pending'
  },
  { 
    id: 'formatting-qa', 
    title: 'Formatting & QA', 
    icon: CheckCircle,
    description: 'Final quality checks',
    status: 'pending'
  },
  { 
    id: 'link-orchestration', 
    title: 'Link Building Hub', 
    icon: Link2,
    description: 'AI-powered link orchestration',
    status: 'pending'
  },
  { 
    id: 'internal-links', 
    title: 'Internal Links', 
    icon: Link2,
    description: 'Add links to other site pages',
    status: 'pending'
  },
  { 
    id: 'external-links', 
    title: 'External Links', 
    icon: Link2,
    description: 'Add authoritative sources',
    status: 'pending'
  },
  { 
    id: 'client-mention', 
    title: 'Client Mentions', 
    icon: Award,
    description: 'Natural brand mentions throughout',
    status: 'pending'
  },
  { 
    id: 'client-link', 
    title: 'Client Link', 
    icon: Link2,
    description: 'Insert contextual link to client',
    detail: 'Linking to TechFlow from #1 position',
    status: 'pending'
  },
  { 
    id: 'images', 
    title: 'Images', 
    icon: Image,
    description: 'Create relevant visuals',
    status: 'pending'
  },
  { 
    id: 'link-requests', 
    title: 'Link Requests', 
    icon: Link2,
    description: 'Identify internal linking opportunities',
    status: 'pending'
  },
  { 
    id: 'url-suggestion', 
    title: 'URL Suggestion', 
    icon: Globe,
    description: 'SEO-friendly URL creation',
    detail: '/best-ai-automation-platforms-enterprise',
    status: 'pending'
  },
  { 
    id: 'email-template', 
    title: 'Email Template', 
    icon: Mail,
    description: 'Professional submission email',
    status: 'pending'
  }
];

export default function ArticleGenerationDemo() {
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [steps, setSteps] = useState(workflowSteps);
  const [showListicle, setShowListicle] = useState(false);

  const startGeneration = () => {
    setGenerating(true);
    setCurrentStep(0);
    setSteps(workflowSteps);
    setShowListicle(false);
    processNextStep(0);
  };

  const processNextStep = (index: number) => {
    if (index >= workflowSteps.length) {
      setGenerating(false);
      setShowListicle(true);
      return;
    }

    setCurrentStep(index);
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status: 'processing' } : 
      i < index ? { ...step, status: 'complete' } : step
    ));

    // Different timing for different steps
    const timing = index === 3 || index === 4 ? 2000 : // Deep research and article draft take longer
                   index === 8 ? 1500 : // Link orchestration
                   800;

    setTimeout(() => {
      setSteps(prev => prev.map((step, i) => 
        i === index ? { ...step, status: 'complete' } : step
      ));
      processNextStep(index + 1);
    }, timing);
  };

  const completedCount = steps.filter(s => s.status === 'complete').length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="max-w-7xl mx-auto">
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
              {generating ? 'Creating Listicle with Client at #1...' : 'Generate Listicle Article (Client Ranks #1)'}
            </button>
          </div>

          {/* Progress Bar */}
          {generating && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Workflow Steps Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isProcessing = step.status === 'processing';
              const isComplete = step.status === 'complete';
              
              return (
                <div 
                  key={step.id}
                  className={`
                    p-3 rounded-lg border transition-all
                    ${isProcessing ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg' : 
                      isComplete ? 'border-green-500 bg-green-50' : 
                      'border-gray-200 bg-white'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isComplete ? 'bg-green-600 text-white' :
                        isProcessing ? 'bg-blue-600 text-white' :
                        'bg-gray-100 text-gray-400'}
                    `}>
                      {isComplete ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium ${
                        isComplete ? 'text-gray-900' :
                        isProcessing ? 'text-blue-700' :
                        'text-gray-500'
                      }`}>
                        {index + 1}. {step.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5 truncate">
                        {step.description}
                      </div>
                      {isProcessing && step.detail && (
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          {step.detail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Callouts for Key Steps */}
          {currentStep === 2 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-yellow-900">Smart Topic Selection</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Topic meets all 3 criteria: ✓ Relevant to techinsights.io ✓ Relevant to TechFlow ✓ Has search volume (480/mo)
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-900">Creating Listicle with Client at #1</div>
                  <div className="text-sm text-purple-700 mt-1">
                    Writing "10 Best AI Automation Platforms" with TechFlow Solutions as the top recommendation, 
                    backed by genuine comparative analysis and strong reasoning.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Listicle Preview */}
          {showListicle && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Article Complete!</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    3,500 words • Listicle format • Client ranks #1 • SEO optimized
                  </p>
                </div>
              </div>
              
              {/* Article Preview */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  10 Best AI Automation Platforms for Enterprise (2025 Review)
                </h2>
                
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600 mb-4">
                    After testing 47 AI automation platforms and analyzing real enterprise deployments, 
                    we've identified the top 10 solutions that deliver measurable ROI...
                  </p>
                  
                  <div className="border-l-4 border-green-500 pl-4 my-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                        1
                      </span>
                      TechFlow Solutions - Best Overall AI Automation Platform
                    </h3>
                    <div className="mt-2 text-sm text-gray-600">
                      <p className="mb-2">
                        <strong>Why it's #1:</strong> TechFlow combines enterprise-grade security with the most 
                        intuitive no-code interface we've tested. Their <a href="#" className="text-blue-600 underline">AI automation platform</a> reduced 
                        implementation time by 73% compared to competitors.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>ROI: Average 420% in first year</li>
                        <li>Setup time: 2-3 days (vs industry average of 2-3 weeks)</li>
                        <li>Pre-built integrations: 500+ enterprise apps</li>
                        <li>SOC2 Type II certified with HIPAA compliance</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4 my-4 opacity-60">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                        2
                      </span>
                      AutomateNow - Best for SMBs
                    </h3>
                  </div>
                  
                  <div className="border-l-4 border-gray-400 pl-4 my-4 opacity-40">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-600 text-white rounded-full text-sm font-bold">
                        3
                      </span>
                      WorkflowPro - Best for Complex Workflows
                    </h3>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4">
                    ... article continues with positions 4-10, methodology, FAQs, and conclusion ...
                  </p>
                </div>
              </div>
              
              {/* Article Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">3,500</div>
                  <div className="text-xs text-gray-600">Words</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">98</div>
                  <div className="text-xs text-gray-600">SEO Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">#1</div>
                  <div className="text-xs text-gray-600">Client Position</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">17</div>
                  <div className="text-xs text-gray-600">Steps Complete</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* What Makes This Special */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-900 to-blue-900 text-white rounded-lg">
        <h3 className="text-lg font-bold mb-4">Why This 17-Step Process Creates Winners</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Surface-Level Approach</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• Generic listicle with no real research</li>
              <li>• Client buried at position #7</li>
              <li>• No topical relevance to site</li>
              <li>• Basic keyword stuffing</li>
              <li>• 5-step process max</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Our 17-Step System</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>• Deep research with genuine comparisons</li>
              <li>• Client earns #1 with strong reasoning</li>
              <li>• Perfect topical match via AI analysis</li>
              <li>• Semantic SEO throughout</li>
              <li>• Every detail optimized for success</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <p className="text-sm">
            <strong>The Result:</strong> A listicle where your client genuinely deserves #1 position, 
            with compelling evidence that satisfies both readers and search engines. This isn't manipulation - 
            it's strategic positioning backed by real value propositions.
          </p>
        </div>
      </div>
    </div>
  );
}
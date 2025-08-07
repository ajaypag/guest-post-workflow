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
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const startGeneration = () => {
    setGenerating(true);
    setCurrentStep(0);
    setSteps(workflowSteps);
    setShowDetails(null);
    processNextStep(0);
  };

  const processNextStep = (index: number) => {
    if (index >= workflowSteps.length) {
      setGenerating(false);
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
              {generating ? 'Running 17-Step Content Pipeline...' : 'Watch Our 17-Step Article Generation'}
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

          {/* Dynamic Step Details - The Real Magic */}
          {currentStep === 1 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900">Qualifying techinsights.io</div>
                  <div className="text-sm text-blue-700 mt-1">
                    <strong>Finding topical overlap:</strong> Scraping 8,472 keywords this site ranks for...
                  </div>
                  <div className="mt-2 font-mono text-xs bg-white p-2 rounded border border-blue-200">
                    ✓ "enterprise automation" - Position 4<br/>
                    ✓ "workflow automation tools" - Position 12<br/>
                    ✓ "ai process optimization" - Position 7<br/>
                    <span className="text-blue-600">→ Direct match with TechFlow's service pages!</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-yellow-900">Not Your Average Topic Selection</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Running 3-way analysis: Site relevance × Client relevance × Search volume
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="p-2 bg-white rounded border border-yellow-200">
                      <span className="text-red-600">❌ "Best CRM Software"</span> - Site ranks but no client relevance
                    </div>
                    <div className="p-2 bg-white rounded border border-yellow-200">
                      <span className="text-red-600">❌ "AI Automation Tips"</span> - Too generic, no search volume
                    </div>
                    <div className="p-2 bg-green-50 rounded border border-green-300">
                      <span className="text-green-600">✅ "Enterprise Workflow Automation: Build vs Buy Decision Framework"</span><br/>
                      <span className="text-xs text-gray-600">480 searches/mo • Site ranks for "enterprise workflow" • Client sells this</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-900">O3 Deep Research (Not ChatGPT Garbage)</div>
                  <div className="text-sm text-purple-700 mt-1">
                    Analyzing top 20 SERPs, competitor content, and industry reports...
                  </div>
                  <div className="mt-2 bg-white p-3 rounded border border-purple-200 text-xs space-y-2">
                    <div><strong>Discovered gap:</strong> No one covers TCO calculations for workflow automation</div>
                    <div><strong>Unique angle:</strong> Interview data from 47 enterprise deployments</div>
                    <div><strong>Semantic targets:</strong> 142 related entities to naturally weave in</div>
                    <div className="text-purple-600 font-semibold">
                      → Creating 23-section outline with original research positioning
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Edit3 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-green-900">Section-by-Section O3 Writing</div>
                  <div className="text-sm text-green-700 mt-1">
                    Not one giant prompt - 23 individual reasoning chains with context
                  </div>
                  <div className="mt-2 bg-white p-3 rounded border border-green-200">
                    <div className="text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Section 8: "Hidden Costs of DIY Automation"</span>
                      </div>
                      <div className="pl-4 text-gray-600">
                        Reasoning: Competitors focus on tool costs. We'll add developer hours, maintenance debt, 
                        security audits. Natural place to mention TechFlow's all-inclusive model...
                      </div>
                      <div className="pl-4 mt-1">
                        <span className="text-green-600 font-semibold">→ 487 words generated with 3 data points</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900">Semantic SEO Audit (The Unfair Advantage)</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Not keyword stuffing - strategic entity placement for topical authority
                  </div>
                  <div className="mt-2 bg-white p-3 rounded border border-blue-200 text-xs space-y-1">
                    <div>✓ Added "orchestration" concept to 4 sections (competitor gap)</div>
                    <div>✓ Wove in "compliance automation" naturally (high-value term)</div>
                    <div>✓ Connected to "digital transformation" entity cluster</div>
                    <div>✓ Strengthened causality chains between problem → solution</div>
                    <div className="text-blue-600 font-semibold mt-2">
                      → Google will understand this as authoritative, not promotional
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 12 && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-900">Strategic Client Linking</div>
                  <div className="text-sm text-purple-700 mt-1">
                    Not random - contextually perfect placement
                  </div>
                  <div className="mt-2 bg-white p-3 rounded border border-purple-200 text-xs">
                    <div className="font-mono">
                      "...the hidden costs often exceed $200K annually. This is why forward-thinking 
                      enterprises are turning to <span className="text-blue-600 underline">managed automation platforms</span> 
                      that bundle infrastructure, security, and maintenance into predictable pricing."
                    </div>
                    <div className="mt-2 text-purple-600">
                      → Anchor: "managed automation platforms" → TechFlow service page
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completion State */}
          {completedCount === steps.length && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">17 Steps Complete</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This isn't AI slop. This is strategic content engineering.
                  </p>
                </div>
              </div>
              
              {/* What Actually Happened */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">What We Created</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 3,847 words of original thought leadership</li>
                    <li>• 23 sections with unique angles</li>
                    <li>• 142 semantic entities naturally placed</li>
                    <li>• Client featured as case study, not advertisement</li>
                    <li>• 12 internal link opportunities identified</li>
                  </ul>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Why It Will Rank</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Topical authority signals throughout</li>
                    <li>• Answers questions competitors missed</li>
                    <li>• Natural link magnetism from unique data</li>
                    <li>• Perfect relevance to host site's audience</li>
                    <li>• E-E-A-T signals from industry expertise</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>The Real Difference:</strong> We don't write "10 Best [Thing]" listicles. 
                  We create strategic content that positions your client as the obvious solution 
                  through genuine value and sophisticated SEO, not manipulation.
                </p>
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
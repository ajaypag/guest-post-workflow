'use client';

import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  Brain, 
  PenTool, 
  CheckCircle, 
  Link, 
  Send, 
  Image,
  FileText,
  Target,
  Mail,
  ArrowRight,
  Play,
  Clock,
  Zap,
  Eye,
  BarChart3,
  Building2,
  Users,
  TrendingUp
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  inputs: string[];
  outputs: string[];
  aiAssisted: boolean;
  duration: string;
  demoContent: {
    inputExample?: string;
    outputExample?: string;
    processDescription: string;
  };
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'domain-selection',
    name: 'Guest Post Site Selection',
    description: 'Manual selection and validation of target publication website',
    icon: <Globe className="w-5 h-5" />,
    inputs: ['Target publication domain'],
    outputs: ['Guest post website URL', 'Research notes'],
    aiAssisted: false,
    duration: '5-10 min',
    demoContent: {
      inputExample: 'businesstools.com',
      outputExample: 'Target publication: businesstools.com • Editorial focus: B2B productivity tools • Guest post guidelines captured',
      processDescription: 'Pure manual data entry step. You specify which publication site you want to target for the guest post. This becomes the foundation for all strategic analysis in subsequent steps.'
    }
  },
  {
    id: 'keyword-research',
    name: 'Client URL & Keyword Analysis',
    description: 'Load client target pages with AI-generated keywords and analyze topical overlap',
    icon: <Search className="w-5 h-5" />,
    inputs: ['Client database target pages', 'Selected URLs for linking'],
    outputs: ['Target page selection', 'Keyword strategy', 'Topical overlap analysis'],
    aiAssisted: true,
    duration: '10-15 min',
    demoContent: {
      inputExample: 'Client has 15 target pages with pre-generated keywords • Select 2-3 URLs for strategic linking',
      outputExample: 'Selected: /project-management-software (47 keywords) • AI Overlap Score: 8.3/10 • Ahrefs export ready',
      processDescription: 'Complex system loading client URLs from database with AI-generated keyword profiles. AI analyzes topical overlap between guest post site and your client URLs, ranking strategic fit with confidence scores.'
    }
  },
  {
    id: 'topic-generation',
    name: 'Strategic Topic Development',
    description: 'Custom GPT generates topics with natural linking opportunities and keyword validation',
    icon: <Brain className="w-5 h-5" />,
    inputs: ['Guest post site analysis', 'Client URL summaries', 'Keyword preferences'],
    outputs: ['Strategic topic ideas', 'Link placement strategy', 'Volume-validated keywords'],
    aiAssisted: true,
    duration: '15-20 min',
    demoContent: {
      inputExample: 'businesstools.com audience + client PM software URLs + "business-focus" preference',
      outputExample: '"7 project management tools remote teams actually use" • Natural homepage link • "pm software" (2.4K volume)',
      processDescription: 'Integrates with custom "Guest Post Topic Machine" GPT. Auto-generates prompts incorporating guest post site, client URLs, and keyword preferences. Includes Ahrefs volume verification workflow and strategic anchor text planning.'
    }
  },
  {
    id: 'deep-research',
    name: 'Comprehensive Research & Outline',
    description: 'ChatGPT o3 Deep Research tool generates detailed content outline with sources',
    icon: <BarChart3 className="w-5 h-5" />,
    inputs: ['Finalized topic', 'Research prompts', 'Client context'],
    outputs: ['Research outline', 'Source citations', 'Content structure'],
    aiAssisted: true,
    duration: '30-45 min',
    demoContent: {
      inputExample: 'PM tools topic + ChatGPT o3 Deep Research activation',
      outputExample: '15-section outline • 23 industry statistics • 8 case studies • 12 expert quotes • Source links verified',
      processDescription: 'Uses ChatGPT\'s premium Deep Research tool with o3 model. Generates comprehensive research outlines with verified sources, statistics, and expert insights. Can use manual ChatGPT process or autonomous AI agent workflow.'
    }
  },
  {
    id: 'article-draft',
    name: 'AI Article Generation (V2)',
    description: 'OpenAI Agents SDK with o3-2025-04-16 creates articles section-by-section with quality control',
    icon: <PenTool className="w-5 h-5" />,
    inputs: ['Research outline', 'Brand guidelines vector store', 'Writing style requirements'],
    outputs: ['Complete article draft', 'Section-by-section generation log', 'Article completion validation'],
    aiAssisted: true,
    duration: '45-60 min',
    demoContent: {
      inputExample: 'Detailed outline + brand voice guidelines + narrative writing style requirements',
      outputExample: '2,847-word article • 8 sections • Real-time streaming • ArticleEndCritic validates completion against outline',
      processDescription: '3-phase OpenAI Agents conversation: Planning → Title/Intro → Section looping. Uses o3-2025-04-16 with vector store access to brand guidelines. ArticleEndCritic (o4-mini) detects completion. Supports 40+ sections with delimiter parsing and real-time streaming.'
    }
  },
  {
    id: 'content-audit',
    name: 'Semantic SEO Audit',
    description: 'AI analyzes each section for semantic SEO optimization using knowledge base',
    icon: <Eye className="w-5 h-5" />,
    inputs: ['Complete article draft', 'Semantic SEO knowledge base', 'Brand voice requirements'],
    outputs: ['Section-by-section analysis', 'SEO improvements', 'Optimized content'],
    aiAssisted: true,
    duration: '20-30 min',
    demoContent: {
      inputExample: '2,847-word article parsed into 8 auditable sections',
      outputExample: 'Section 1: Strengths (3) + Weaknesses (2) + Optimized version • Citation limit: 3 total • Pattern variety tracked',
      processDescription: 'OpenAI Agents SDK with semantic SEO vector store access. Parses article hierarchically, audits each section for SEO optimization while preserving brand voice. Limits citations to 3 maximum, tracks editing patterns to avoid repetition.'
    }
  },
  {
    id: 'final-polish',
    name: 'Brand Alignment & Polish',
    description: 'AI reviews against brand guide and writing guidelines for final optimization',
    icon: <CheckCircle className="w-5 h-5" />,
    inputs: ['SEO-audited article', 'Brand guide vector store', 'Semantic SEO tips'],
    outputs: ['Brand-aligned content', 'Final polish analysis', 'Publication-ready article'],
    aiAssisted: true,
    duration: '15-25 min',
    demoContent: {
      inputExample: 'Audited article + brand guide access + "words to avoid" filtering',
      outputExample: 'Strengths: Natural brand voice, good flow • Weaknesses: 2 brand guide violations • Polished final version',
      processDescription: 'Uses o3-2025-04-16 with brand guide vector store. Section-by-section analysis with delimiter parsing. Identifies strengths/weaknesses against brand guidelines, applies final polish while preserving structure. Filters prohibited words and maintains semantic SEO improvements.'
    }
  },
  {
    id: 'link-orchestration',
    name: 'AI Link & Media Orchestration',
    description: 'Multi-phase AI system handles internal links, client mentions, images, and outreach preparation',
    icon: <Send className="w-5 h-5" />,
    inputs: ['Polished article', 'Client link strategy', 'Internal link database'],
    outputs: ['Complete article with links', 'Image strategy', 'Outreach materials', 'Publisher URLs'],
    aiAssisted: true,
    duration: '25-35 min',
    demoContent: {
      inputExample: 'Final article + client homepage target + internal link opportunities',
      outputExample: '3 internal links inserted • Natural client mention + homepage link • Image strategy • Publisher pitch ready',
      processDescription: '3-phase OpenAI Agents orchestration: Phase 1 (parallel: internal links + client mentions), Phase 2 (client link with natural conversation flow), Phase 3 (parallel: images + link requests + URL suggestions). Database session tracking with error recovery.'
    }
  }
];

const bulkAnalysisSteps = [
  {
    name: 'Competitor Domain Processing',
    description: 'Intelligent domain normalization with order integration and Airtable sync',
    icon: <Building2 className="w-5 h-5" />,
    process: 'Domain cleaning (protocols, www, trailing slashes), automatic bulk analysis creation from confirmed orders, target page keyword aggregation. Supports manual input, CSV upload, and Airtable metadata preservation.'
  },
  {
    name: 'DataForSEO Intelligence Pipeline',
    description: 'Sophisticated keyword extraction with regex batching and 30-day caching',
    icon: <Search className="w-5 h-5" />,
    process: 'API: dataforseo_labs/google/ranked_keywords/live • 25 concurrent requests • Regex patterns (keyword1|keyword2) • Smart batching (1000 char limit) • Captures positions 1-100, search volumes, competition data, landing pages • PostgreSQL storage with incremental analysis'
  },
  {
    name: 'AI Qualification Engine (O3)',
    description: 'OpenAI O3 model analyzes topical overlap with sophisticated scoring criteria',
    icon: <Target className="w-5 h-5" />,
    process: 'AI evaluates: Direct/Related/Both/None overlap • Authority levels (Strong 1-30, Moderate 31-60, Weak 61-100) • Topic scope (short_tail/long_tail/ultra_long_tail) • Qualification tiers: high_quality/good_quality/marginal_quality/disqualified • Evidence tracking with median positions'
  },
  {
    name: 'Strategic Site Matching & Scoring',
    description: 'Multi-factor algorithm matches against 13,000+ sites with commercial viability analysis',
    icon: <TrendingUp className="w-5 h-5" />,
    process: 'Database matching: DR ranges, traffic volumes, guest post costs, niche arrays • Match score 0-100 with evidence arrays • Ranking factors: Topical relevance + Domain authority + Commercial viability + Quality metrics • Auto-workflow generation for qualified opportunities'
  }
];

export default function InteractiveWorkflowDemo() {
  const [activeTab, setActiveTab] = useState<'workflow' | 'bulk'>('bulk');
  const [selectedStep, setSelectedStep] = useState<string>('domain-selection');
  const [isPlaying, setIsPlaying] = useState(false);

  const currentStep = workflowSteps.find(step => step.id === selectedStep);

  const playFullDemo = () => {
    setIsPlaying(true);
    let stepIndex = 0;
    
    const playNextStep = () => {
      if (stepIndex < workflowSteps.length) {
        setSelectedStep(workflowSteps[stepIndex].id);
        stepIndex++;
        setTimeout(playNextStep, 2000);
      } else {
        setIsPlaying(false);
      }
    };
    
    playNextStep();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">See Our Actual Process</h3>
            <p className="text-sm text-gray-600 mt-1">Click through each step to see exactly how we work</p>
          </div>
          <button
            onClick={playFullDemo}
            disabled={isPlaying}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPlaying ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Playing...' : 'Auto Demo'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bulk'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Bulk Analysis System
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'workflow'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Guest Post Workflow (8 Steps)
        </button>
      </div>

      {activeTab === 'workflow' ? (
        <div className="grid lg:grid-cols-3 min-h-[500px]">
          {/* Step List */}
          <div className="bg-gray-50 border-r">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">Workflow Steps</h4>
              <div className="space-y-1">
                {workflowSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStep(step.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedStep === step.id
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-medium text-gray-500 w-6">
                        {index + 1}
                      </div>
                      <div className="text-blue-600">{step.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{step.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {step.aiAssisted && <Zap className="w-3 h-3" />}
                          {step.duration}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step Details */}
          <div className="lg:col-span-2 p-6">
            {currentStep && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    {currentStep.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xl font-semibold text-gray-900">{currentStep.name}</h4>
                      {currentStep.aiAssisted && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          <Zap className="w-3 h-3" />
                          AI-Assisted
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{currentStep.description}</p>
                    <p className="text-sm text-gray-500 mt-1">Duration: {currentStep.duration}</p>
                  </div>
                </div>

                {/* Process Description */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">How This Step Works</h5>
                  <p className="text-gray-700 text-sm">{currentStep.demoContent.processDescription}</p>
                </div>

                {/* Input/Output Example */}
                <div className="grid md:grid-cols-2 gap-4">
                  {currentStep.demoContent.inputExample && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        Input Example
                      </h5>
                      <p className="text-sm text-gray-700 font-mono bg-white p-2 rounded border">
                        {currentStep.demoContent.inputExample}
                      </p>
                    </div>
                  )}
                  
                  {currentStep.demoContent.outputExample && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Output Example
                      </h5>
                      <p className="text-sm text-gray-700 font-mono bg-white p-2 rounded border">
                        {currentStep.demoContent.outputExample}
                      </p>
                    </div>
                  )}
                </div>

                {/* Technical Details */}
                <div className="border rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">Technical Inputs & Outputs</h5>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h6 className="font-medium text-gray-700 mb-2">Inputs:</h6>
                      <ul className="space-y-1">
                        {currentStep.inputs.map((input, index) => (
                          <li key={index} className="text-gray-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                            {input}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-medium text-gray-700 mb-2">Outputs:</h6>
                      <ul className="space-y-1">
                        {currentStep.outputs.map((output, index) => (
                          <li key={index} className="text-gray-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            {output}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Bulk Analysis Tab */
        <div className="p-6">
          <div className="text-center mb-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-2">Bulk Analysis System</h4>
            <p className="text-gray-600">Analyze dozens of competitors and find hundreds of strategic opportunities</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {bulkAnalysisSteps.map((step, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {step.icon}
                  </div>
                  <div className="text-sm font-medium text-gray-500">Step {index + 1}</div>
                </div>
                <h5 className="font-semibold text-gray-900 mb-2">{step.name}</h5>
                <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                <p className="text-xs text-gray-500 italic">{step.process}</p>
              </div>
            ))}
          </div>

          {/* Example Results */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-6">
            <h5 className="font-semibold text-gray-900 mb-4">Real Analysis Results</h5>
            <div className="grid md:grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 mb-1">47</div>
                <div className="text-sm text-gray-600">Competitor domains processed</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 mb-1">1,247</div>
                <div className="text-sm text-gray-600">Keywords extracted via DataForSEO</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 mb-1">89</div>
                <div className="text-sm text-gray-600">High-quality guest post matches</div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-left">
              <h6 className="font-medium text-gray-800 mb-2">Technical Output Sample:</h6>
              <div className="text-xs font-mono bg-gray-50 p-3 rounded border">
                <div className="text-green-600">• techcrunch.com: high_quality (Direct overlap + Strong authority)</div>
                <div className="text-blue-600">• industryweek.com: good_quality (Related overlap + Moderate authority)</div>
                <div className="text-yellow-600">• bizjournal.com: marginal_quality (Weak signals)</div>
                <div className="text-gray-500">• Match scores: 94, 78, 45 • Evidence: [direct_count: 23, median_pos: 12]</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
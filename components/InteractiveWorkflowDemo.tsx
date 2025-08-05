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
    name: 'Strategic Keyword Selection',
    description: 'Choose which client pages need links and verify keyword overlap',
    icon: <Search className="w-5 h-5" />,
    inputs: ['Your client\'s target pages', 'Their priority keywords'],
    outputs: ['Selected pages for linking', 'Verified keyword overlap', 'Strategic angles'],
    aiAssisted: true,
    duration: '10-15 min',
    demoContent: {
      inputExample: 'Client wants to rank their /project-management-software page for "PM tools"',
      outputExample: 'Perfect match: Guest post site ranks #5 for "PM tools" - your content will fit naturally',
      processDescription: 'Select which of your client\'s pages need backlinks. AI analyzes if the guest post site has topical authority for those keywords. This ensures your content will feel natural and have ranking potential - not forced or off-topic.'
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
    name: 'Article Writing',
    description: 'AI writes comprehensive articles that provide genuine value to readers',
    icon: <PenTool className="w-5 h-5" />,
    inputs: ['Research outline', 'Brand voice', 'Target audience'],
    outputs: ['2000-3000 word article', 'Natural narrative flow', 'Strategic brand integration'],
    aiAssisted: true,
    duration: '45-60 min',
    demoContent: {
      inputExample: 'Research on PM tools + conversational brand voice + targeting remote team managers',
      outputExample: '2,847-word comprehensive guide that readers actually want to share - not thin AI content',
      processDescription: 'AI writes section by section, maintaining narrative flow and genuine helpfulness. Uses your brand guidelines to sound like you, not a robot. Strategic placement of your brand where it adds value, not forced mentions.'
    }
  },
  {
    id: 'content-audit',
    name: 'Content Quality Audit',
    description: 'Ensure your article will actually rank, not just read well',
    icon: <Eye className="w-5 h-5" />,
    inputs: ['Article draft', 'Target keywords', 'Site requirements'],
    outputs: ['SEO-optimized content', 'Natural keyword integration', 'Ranking improvements'],
    aiAssisted: true,
    duration: '20-30 min',
    demoContent: {
      inputExample: 'Article about PM tools targeting "project management software" keyword',
      outputExample: 'Keywords naturally integrated 7 times • Related terms added • Headers optimized for featured snippets',
      processDescription: 'AI reviews content to ensure it will rank for target keywords without keyword stuffing. Adds semantic variations and related terms Google expects to see. Maintains readability while optimizing for search - the balance that gets results.'
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
    name: 'Strategic Link Integration',
    description: 'AI handles all linking so it feels natural, not like a link scheme',
    icon: <Send className="w-5 h-5" />,
    inputs: ['Final article', 'Link targets', 'Publisher requirements'],
    outputs: ['Natural link placement', 'Supporting internal links', 'Image recommendations', 'Outreach templates'],
    aiAssisted: true,
    duration: '25-35 min',
    demoContent: {
      inputExample: 'PM tools article + client homepage needs a link with "project management software" anchor',
      outputExample: 'Homepage link placed naturally in context • 3 supporting internal links • Custom outreach email for publisher',
      processDescription: 'AI finds natural places to mention your brand and add links without forcing them. Adds supporting internal links to boost authority. Prepares everything publishers need - you just send and follow up.'
    }
  }
];

const bulkAnalysisSteps = [
  {
    name: 'Client Target URLs & Keywords',
    description: 'Load your pages that need links and their target keywords',
    icon: <Building2 className="w-5 h-5" />,
    process: 'Pull in your client\'s target pages (the ones that need backlinks) and their associated keywords. This becomes the foundation for finding topically relevant guest post opportunities in our 13,000+ site database.'
  },
  {
    name: 'Site Keyword Discovery',
    description: 'Find what keywords each guest post site actually ranks for',
    icon: <Search className="w-5 h-5" />,
    process: 'DataForSEO shows us what keywords each potential guest post site ranks for. We\'re looking for sites that rank for keywords related to your client\'s niche - this means your content will naturally fit and have a better chance of ranking.'
  },
  {
    name: 'Smart Topical Analysis (O3)',
    description: 'AI reasoning model evaluates if sites are genuinely good matches',
    icon: <Target className="w-5 h-5" />,
    process: 'OpenAI O3 reasoning model thinks through each match: Does this site have topical authority in your client\'s niche? Will your content feel natural here? It\'s not just matching keywords - it\'s understanding context and relevance.'
  },
  {
    name: 'Opportunity Ranking & Selection',
    description: 'Surface the best guest post opportunities from 13,000+ sites',
    icon: <TrendingUp className="w-5 h-5" />,
    process: 'Sites are scored and ranked by how well they match your client\'s needs. High-quality matches become guest post opportunities. Click to convert them into full workflows - no manual searching through thousands of sites.'
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
            <h5 className="font-semibold text-gray-900 mb-4">Example Client Results</h5>
            <div className="grid md:grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 mb-1">5</div>
                <div className="text-sm text-gray-600">Client target pages analyzed</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 mb-1">247</div>
                <div className="text-sm text-gray-600">Relevant keywords to match</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 mb-1">89</div>
                <div className="text-sm text-gray-600">Quality sites found from 13,000+</div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-left">
              <h6 className="font-medium text-gray-800 mb-2">What This Means:</h6>
              <div className="text-sm text-gray-700 space-y-1">
                <div>✅ <strong>techcrunch.com</strong> - Perfect match: They rank for your exact keywords</div>
                <div>✅ <strong>industryweek.com</strong> - Good fit: Strong in your broader industry</div>
                <div>⚠️ <strong>bizjournal.com</strong> - Maybe: Some overlap but needs manual review</div>
                <div className="text-xs text-gray-500 mt-2">No more guessing which sites will accept your content - we show you where it naturally fits</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
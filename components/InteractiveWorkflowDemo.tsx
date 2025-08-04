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
    name: 'Site Selection & Analysis',
    description: 'AI analyzes target site\'s topical authority and keyword clusters',
    icon: <Globe className="w-5 h-5" />,
    inputs: ['Target publication website'],
    outputs: ['Site analysis', 'Topic clusters', 'Editorial guidelines'],
    aiAssisted: true,
    duration: '5-10 min',
    demoContent: {
      inputExample: 'businesstools.com',
      outputExample: 'DR 45 • Ranks for "project management software" • 47+ PM tool articles • Accepts comprehensive reviews',
      processDescription: 'Our AI maps the site\'s existing authority clusters, finds where your content would naturally fit, and extracts editorial patterns.'
    }
  },
  {
    id: 'keyword-research',
    name: 'Strategic Keyword Mapping',
    description: 'Extract keywords from YOUR page, find overlap with target site\'s rankings',
    icon: <Search className="w-5 h-5" />,
    inputs: ['Your target page URL', 'Site analysis'],
    outputs: ['Keyword overlap map', 'Strategic anchors', 'Content angle'],
    aiAssisted: true,
    duration: '10-15 min',
    demoContent: {
      inputExample: 'yoursite.com/project-management-software',
      outputExample: 'Direct overlap: "project management software" • Related: "PM tools", "team collaboration" • Recommended angle: comparison guide',
      processDescription: 'Instead of guessing, we find the exact keywords both sites rank for and build a strategic content angle around proven overlap.'
    }
  },
  {
    id: 'topic-generation',
    name: 'Topic & Angle Development',
    description: 'Create content angles that serve both audiences naturally',
    icon: <Brain className="w-5 h-5" />,
    inputs: ['Keyword overlap', 'Site editorial style', 'Your brand positioning'],
    outputs: ['Article topic', 'Content outline', 'Value proposition'],
    aiAssisted: true,
    duration: '15-20 min',
    demoContent: {
      inputExample: 'Business tools site + PM software overlap',
      outputExample: '"7 project management tools remote teams rely on for virtual collaboration" - fits their remote work content cluster',
      processDescription: 'We craft topics that feel native to their audience while naturally showcasing your solution - no awkward shoehorning.'
    }
  },
  {
    id: 'deep-research',
    name: 'Research & Data Gathering',
    description: 'Comprehensive research with stats, examples, and original insights',
    icon: <BarChart3 className="w-5 h-5" />,
    inputs: ['Article topic', 'Industry context', 'Competitor analysis'],
    outputs: ['Research report', 'Statistics bank', 'Expert quotes', 'Case studies'],
    aiAssisted: true,
    duration: '30-45 min',
    demoContent: {
      inputExample: 'PM tools for remote teams topic',
      outputExample: '15 industry stats • 3 remote work case studies • Integration data • Pricing comparisons • User testimonials',
      processDescription: 'This is where we build the substance. Real data, genuine insights, and valuable information that makes the content worth reading.'
    }
  },
  {
    id: 'article-draft',
    name: 'Content Creation',
    description: '2000-3000 word articles with genuine learning value',
    icon: <PenTool className="w-5 h-5" />,
    inputs: ['Research report', 'Content outline', 'Brand voice guidelines'],
    outputs: ['Full article draft', 'Strategic link placement', 'Call-to-action'],
    aiAssisted: true,
    duration: '45-60 min',
    demoContent: {
      inputExample: 'All research + outline + brand voice',
      outputExample: '2,847-word comprehensive guide with natural brand mention and homepage link using brand anchor',
      processDescription: 'AI writes the first draft, but it\'s informed by all the strategic research. Natural brand integration, valuable content, proper structure.'
    }
  },
  {
    id: 'content-audit',
    name: 'Quality & Strategy Audit',
    description: 'Expert review of content quality, link placement, and strategic fit',
    icon: <Eye className="w-5 h-5" />,
    inputs: ['Article draft', 'Site guidelines', 'Link strategy'],
    outputs: ['Quality assessment', 'Strategic feedback', 'Improvement recommendations'],
    aiAssisted: true,
    duration: '20-30 min',
    demoContent: {
      inputExample: 'Complete article draft',
      outputExample: 'Content quality: 8.5/10 • Link placement: Natural • Strategic fit: Excellent • 3 minor improvements suggested',
      processDescription: 'AI audits the content for quality, readability, strategic alignment, and natural link placement. Human experts validate the assessment.'
    }
  },
  {
    id: 'final-polish',
    name: 'Editorial Polish & Optimization',
    description: 'Final refinements for maximum impact and editorial approval',
    icon: <CheckCircle className="w-5 h-5" />,
    inputs: ['Audited draft', 'Quality feedback', 'Editorial requirements'],
    outputs: ['Publication-ready article', 'Meta descriptions', 'Image suggestions'],
    aiAssisted: true,
    duration: '15-25 min',
    demoContent: {
      inputExample: 'Quality-audited article + feedback',
      outputExample: 'Polished 2,847-word article ready for submission • SEO-optimized • Editor-friendly formatting',
      processDescription: 'Final optimization pass - readability improvements, SEO elements, formatting for publication, and editorial compliance.'
    }
  },
  {
    id: 'link-orchestration',
    name: 'Outreach & Placement',
    description: 'Expert outreach, negotiation, and live link verification',
    icon: <Send className="w-5 h-5" />,
    inputs: ['Final article', 'Publisher contact info', 'Pitch strategy'],
    outputs: ['Publisher response', 'Negotiated terms', 'Live placement confirmation'],
    aiAssisted: false,
    duration: '2-5 days',
    demoContent: {
      inputExample: 'Publication-ready article + publisher contact',
      outputExample: 'Article accepted • $150 placement fee negotiated • Live link confirmed and verified',
      processDescription: 'Human experts handle all publisher communication, negotiate terms, manage revisions, and verify the final live placement.'
    }
  }
];

const bulkAnalysisSteps = [
  {
    name: 'Domain Input & Analysis',
    description: 'Upload competitor domains or let AI discover them',
    icon: <Building2 className="w-5 h-5" />,
    process: 'AI analyzes each domain\'s content strategy, keyword focus, and topical authority'
  },
  {
    name: 'Keyword Extraction',
    description: 'Extract ranking keywords from each domain',
    icon: <Search className="w-5 h-5" />,
    process: 'DataForSEO API pulls real ranking data, organized by topic clusters'
  },
  {
    name: 'Opportunity Mapping',
    description: 'Find guest posting sites that overlap with competitor keywords',
    icon: <Target className="w-5 h-5" />,
    process: 'Cross-reference competitor keywords with our database of 13,000+ guest posting sites'
  },
  {
    name: 'Strategic Prioritization',
    description: 'Rank opportunities by strategic value and effort',
    icon: <TrendingUp className="w-5 h-5" />,
    process: 'AI scores each opportunity based on keyword overlap strength, site authority, and content fit'
  }
];

export default function InteractiveWorkflowDemo() {
  const [activeTab, setActiveTab] = useState<'workflow' | 'bulk'>('workflow');
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
          onClick={() => setActiveTab('workflow')}
          className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'workflow'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Guest Post Workflow (8 Steps)
        </button>
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
            <h5 className="font-semibold text-gray-900 mb-4">Example Analysis Results</h5>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 mb-1">47</div>
                <div className="text-sm text-gray-600">Competitor domains analyzed</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 mb-1">1,247</div>
                <div className="text-sm text-gray-600">Strategic opportunities found</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 mb-1">89%</div>
                <div className="text-sm text-gray-600">Keyword overlap accuracy</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
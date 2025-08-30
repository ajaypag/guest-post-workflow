'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Link, 
  MessageSquare, 
  Image as ImageIcon, 
  FileText, 
  Globe,
  ChevronRight,
  Download,
  Copy,
  AlertCircle,
  Zap,
  Settings,
  InfoIcon
} from 'lucide-react';

interface OrchestrationProgress {
  phase: number;
  message: string;
  timestamp: string;
}

interface OrchestrationResult {
  sessionId: string;
  finalArticle: string;
  modifications: {
    internalLinks: any[];
    clientMentions: any[];
    clientLink: any;
  };
  imageStrategy: any;
  linkRequests: string;
  urlSuggestion: string;
  success: boolean;
  error?: string;
}

interface LinkOrchestrationStepProps {
  step: any; // WorkflowStep type
  workflow: any; // GuestPostWorkflow type
  onChange: (data: any) => void;
  onWorkflowChange?: (workflow: any) => void;
  onAgentStateChange?: (agentRunning: boolean) => void;
  onUnsavedContentChange?: (hasUnsavedContent: boolean) => void;
}

const LinkOrchestrationStep: React.FC<LinkOrchestrationStepProps> = ({
  step,
  workflow,
  onChange,
  onWorkflowChange,
  onAgentStateChange,
  onUnsavedContentChange
}) => {
  const data = step.outputs || {};
  const workflowId = workflow.id;
  
  // Tab state for orchestration vs individual steps
  const [activeApproach, setActiveApproach] = useState<'orchestration' | 'individual'>('orchestration');
  
  // Orchestration specific state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OrchestrationProgress[]>([]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('setup');

  // Pull data from workflow fields
  const articleDraftStep = workflow.steps.find((s: any) => s.id === 'article-draft');
  const domainSelectionStep = workflow.steps.find((s: any) => s.id === 'domain-selection');
  const topicGenerationStep = workflow.steps.find((s: any) => s.id === 'topic-generation');
  const semanticSeoStep = workflow.steps.find((s: any) => s.id === 'content-audit');
  const polishStep = workflow.steps.find((s: any) => s.id === 'final-polish');
  const formattingQaStep = workflow.steps.find((s: any) => s.id === 'formatting-qa');

  // Implement fallback strategy for article content
  const article = formattingQaStep?.outputs?.article || 
                  polishStep?.outputs?.article || 
                  semanticSeoStep?.outputs?.fullArticle || 
                  articleDraftStep?.outputs?.fullArticle || '';
  
  // Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';
  
  if (domainSelectionStep?.outputs?.websiteId && workflow.website) {
    guestPostSite = workflow.website.domain;
  }

  const targetKeyword = topicGenerationStep?.outputs?.finalKeyword || '';
  
  // Client info comes from workflow level (if client is associated) or workflow fields
  const clientName = workflow.client?.name || workflow.clientName || '';
  const clientUrl = topicGenerationStep?.outputs?.clientTargetUrl || workflow.client?.website || workflow.clientUrl || '';
  
  // Target domain is the guest post site
  const targetDomain = guestPostSite || workflow.targetDomain || '';
  
  // Anchor text from topic generation step, or user can optionally override
  const suggestedAnchorText = topicGenerationStep?.outputs?.desiredAnchorText || '';
  const [anchorText, setAnchorText] = useState(data.anchorText || suggestedAnchorText || '');

  // Load previous result if exists
  useEffect(() => {
    if (data.orchestrationResult) {
      setResult(data.orchestrationResult);
      setActiveTab('results');
    }
  }, [data.orchestrationResult]);

  const handleOrchestrate = async () => {
    // Check if required data exists in workflow
    const missingFields = [];
    if (!article) missingFields.push('Article content (complete Step 5: Article Draft)');
    if (!guestPostSite) missingFields.push('Guest post site (complete Step 1: Domain Selection)');
    if (!targetKeyword) missingFields.push('Target keyword (complete Step 3: Topic Generation)');
    if (!clientName) missingFields.push('Client name (set in workflow creation)');
    if (!clientUrl) missingFields.push('Client URL (set in workflow creation)');
    if (!targetDomain) missingFields.push('Target domain (set in workflow creation)');

    if (missingFields.length > 0) {
      alert('Missing required data:\n\n' + missingFields.join('\n'));
      return;
    }

    setIsProcessing(true);
    onAgentStateChange?.(true); // Notify parent about agent running
    setError(null);
    setProgress([]);
    setCurrentPhase(0);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/orchestrate-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article,
          targetDomain,
          clientName,
          clientUrl,
          anchorText,
          guestPostSite,
          targetKeyword,
          useStreaming: true
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start orchestration: ${response.statusText}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              if (event.type === 'progress') {
                setProgress(prev => [...prev, event]);
                setCurrentPhase(event.phase);
              } else if (event.type === 'complete') {
                setResult(event.result);
                setActiveTab('results');
                
                // Save result to workflow data
                const updatedData = {
                  ...data,
                  article,
                  targetDomain,
                  clientName,
                  clientUrl,
                  anchorText,
                  guestPostSite,
                  targetKeyword,
                  orchestrationResult: event.result
                };
                onChange(updatedData);
                onUnsavedContentChange?.(true); // Mark as having unsaved content
                
                alert('Link orchestration completed successfully!');
              } else if (event.type === 'error') {
                setError(event.error);
                alert(`Orchestration failed: ${event.error}`);
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      onAgentStateChange?.(false); // Notify parent that agent finished
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard`);
  };

  const downloadArticle = () => {
    if (!result?.finalArticle) return;
    
    const blob = new Blob([result.finalArticle], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetKeyword.replace(/\s+/g, '-')}-final.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Article downloaded');
  };

  const phaseInfo = [
    { icon: Link, label: 'Phase 1', description: 'Internal Links & Client Mentions' },
    { icon: MessageSquare, label: 'Phase 2', description: 'Client Link Placement' },
    { icon: ImageIcon, label: 'Phase 3', description: 'Images, Link Requests & URL' }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation for Approach */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveApproach('orchestration')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeApproach === 'orchestration'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>AI Orchestration (All Steps at Once)</span>
            </div>
          </button>
          <button
            onClick={() => setActiveApproach('individual')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeApproach === 'individual'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Individual Steps (Manual Control)</span>
            </div>
          </button>
        </div>

        {/* Approach Content */}
        <div className="p-6">
          {activeApproach === 'orchestration' ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  AI-Powered Link Orchestration
                </h2>
                <p className="text-gray-600 mt-1">
                  Process all 7 link-building steps in one automated workflow using multi-agent AI
                </p>
              </div>

              {/* Data Overview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">📊 Workflow Data Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">
                      <span className="font-medium">Article:</span> {article ? `✅ Available (from ${
                        formattingQaStep?.outputs?.article ? 'Formatting QA' :
                        polishStep?.outputs?.article ? 'Polish & Finalize' :
                        semanticSeoStep?.outputs?.fullArticle ? 'Semantic SEO' :
                        'Article Draft'
                      })` : '❌ Missing'}
                    </p>
                    <p className="text-blue-700">
                      <span className="font-medium">Guest Post Site:</span> {guestPostSite || 'Not set'}
                    </p>
                    <p className="text-blue-700">
                      <span className="font-medium">Target Keyword:</span> {targetKeyword || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      <span className="font-medium">Client Name:</span> {clientName || 'Not set'}
                    </p>
                    <p className="text-blue-700">
                      <span className="font-medium">Client URL:</span> {clientUrl || 'Not set'}
                    </p>
                    <p className="text-blue-700">
                      <span className="font-medium">Suggested Anchor:</span> {suggestedAnchorText || 'None'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab Navigation for Orchestration */}
              <div className="border-b mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('setup')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'setup'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Setup
                  </button>
                  <button
                    onClick={() => setActiveTab('progress')}
                    disabled={!isProcessing && !result}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'progress'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${(!isProcessing && !result) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Progress
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    disabled={!result}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'results'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${!result ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Results
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'setup' && (
                <div className="space-y-4">
                  {/* Optional Anchor Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anchor Text for Client Link
                    </label>
                    <input
                      type="text"
                      value={anchorText}
                      onChange={(e) => {
                        setAnchorText(e.target.value);
                        onChange({ ...data, anchorText: e.target.value });
                      }}
                      placeholder={suggestedAnchorText ? `Suggested: "${suggestedAnchorText}" (or enter your own)` : "Leave blank to let AI choose the best anchor text"}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {suggestedAnchorText ? 
                        `Using suggested anchor text from Topic Generation: "${suggestedAnchorText}"` : 
                        'AI will select natural anchor text if not specified'}
                    </p>
                  </div>

                  {/* Process Overview */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">🔄 What Will Happen:</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-start">
                        <span className="font-medium text-purple-600 mr-2">Phase 1:</span>
                        <span>Add internal links to {guestPostSite} and natural mentions of {clientName}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-medium text-purple-600 mr-2">Phase 2:</span>
                        <span>Insert one contextual link to {clientUrl} with perfect placement</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-medium text-purple-600 mr-2">Phase 3:</span>
                        <span>Generate image strategy, link requests, and URL suggestion</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleOrchestrate}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Start AI Orchestration
                      </>
                    )}
                  </button>
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="space-y-4">
                  {/* Phase Progress */}
                  <div className="grid grid-cols-3 gap-4">
                    {phaseInfo.map((phase, index) => {
                      const Icon = phase.icon;
                      const isActive = currentPhase === index + 1;
                      const isComplete = currentPhase > index + 1;
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border transition-all ${
                            isActive ? 'border-blue-500 bg-blue-50' : 
                            isComplete ? 'border-green-500 bg-green-50' : 
                            'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-5 w-5 ${
                              isActive ? 'text-blue-600' : 
                              isComplete ? 'text-green-600' : 
                              'text-gray-400'
                            }`} />
                            <span className={`font-medium ${
                              isActive ? 'text-blue-900' : 
                              isComplete ? 'text-green-900' : 
                              'text-gray-600'
                            }`}>
                              {phase.label}
                            </span>
                            {isComplete && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
                          </div>
                          <p className="text-sm text-gray-600">{phase.description}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Messages */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-sm mb-3">Activity Log</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {progress.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            Phase {item.phase}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-700">{item.message}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex">
                        <XCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'results' && result && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        {result.modifications.internalLinks.length}
                      </div>
                      <p className="text-sm text-gray-600">Internal Links Added</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        {result.modifications.clientMentions.length}
                      </div>
                      <p className="text-sm text-gray-600">Client Mentions</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        {result.imageStrategy?.totalImages || 0}
                      </div>
                      <p className="text-sm text-gray-600">Images Planned</p>
                    </div>
                  </div>

                  {/* Final Article */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Final Article</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(result.finalArticle, 'Article')}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </button>
                        <button
                          onClick={downloadArticle}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={result.finalArticle}
                      readOnly
                      className="w-full min-h-[300px] p-3 border border-gray-300 rounded-md font-mono text-sm bg-gray-50"
                    />
                  </div>

                  {/* Link Requests */}
                  {result.linkRequests && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium">Link Requests</h3>
                          <p className="text-sm text-gray-600">Send these to the guest post site editor</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(result.linkRequests, 'Link requests')}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                        {result.linkRequests}
                      </pre>
                    </div>
                  )}

                  {/* URL Suggestion */}
                  {result.urlSuggestion && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium mb-3">Suggested URL</h3>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded">
                          {result.urlSuggestion}
                        </code>
                        <button
                          onClick={() => copyToClipboard(result.urlSuggestion, 'URL')}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Image Strategy */}
                  {result.imageStrategy && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-3">
                        <h3 className="font-medium">Image Strategy</h3>
                        <p className="text-sm text-gray-600">
                          {result.imageStrategy.articleType} article - {result.imageStrategy.totalImages} images
                        </p>
                      </div>
                      <div className="space-y-3">
                        {result.imageStrategy.images.map((img: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className={`px-2 py-1 text-xs rounded ${
                              img.type === 'CREATE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {img.type}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{img.placement}</p>
                              <p className="text-sm text-gray-600">{img.purpose}</p>
                              {img.url && (
                                <a
                                  href={img.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View Image
                                </a>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              img.status === 'generated' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {img.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Individual Step-by-Step Process
                </h2>
                <p className="text-gray-600 mt-1">
                  Complete each link-building step manually for full control over the process
                </p>
              </div>

              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <InfoIcon className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">
                      Manual Steps Available
                    </p>
                    <p className="text-sm text-amber-700">
                      To complete these steps individually, use the navigation on the left to go to each step:
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Link className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Step 9: Add Internal Links</h4>
                        <p className="text-sm text-gray-600">Add relevant links to other pages on {guestPostSite || 'the guest post site'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Step 10: Add External Links</h4>
                        <p className="text-sm text-gray-600">Include links to authoritative external sources</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Step 11: Client Mention</h4>
                        <p className="text-sm text-gray-600">Add natural mentions of {clientName || 'your client'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Link className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Step 12: Client Link</h4>
                        <p className="text-sm text-gray-600">Insert contextual link to {clientUrl || 'client website'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Step 13: Create Images</h4>
                        <p className="text-sm text-gray-600">Generate or source relevant images for the article</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Step 14: Link Requests</h4>
                        <p className="text-sm text-gray-600">Identify opportunities for internal linking from existing content</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Step 15: URL Suggestion</h4>
                        <p className="text-sm text-gray-600">Suggest SEO-friendly URL for the guest post</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-700">
                  <strong>Pro tip:</strong> Use the AI Orchestration tab to complete all these steps automatically in one go, saving time while maintaining quality.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkOrchestrationStep;
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Link, 
  MessageSquare, 
  Image, 
  FileText, 
  Globe,
  ChevronRight,
  Download,
  Copy,
  AlertCircle
} from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OrchestrationProgress[]>([]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('setup');

  // Form fields
  const [article, setArticle] = useState(data.article || '');
  const [targetDomain, setTargetDomain] = useState(data.targetDomain || '');
  const [clientName, setClientName] = useState(data.clientName || '');
  const [clientUrl, setClientUrl] = useState(data.clientUrl || '');
  const [anchorText, setAnchorText] = useState(data.anchorText || '');
  const [guestPostSite, setGuestPostSite] = useState(data.guestPostSite || '');
  const [targetKeyword, setTargetKeyword] = useState(data.targetKeyword || '');

  // Load previous result if exists
  useEffect(() => {
    if (data.orchestrationResult) {
      setResult(data.orchestrationResult);
      setActiveTab('results');
    }
  }, [data.orchestrationResult]);

  const handleOrchestrate = async () => {
    if (!article || !targetDomain || !clientName || !clientUrl || !guestPostSite || !targetKeyword) {
      alert('Please fill in all required fields');
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
    { icon: Image, label: 'Phase 3', description: 'Images, Link Requests & URL' }
  ];

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Link Building Orchestration
          </h2>
          <p className="text-gray-600 mt-1">
            Unified step for Internal Links, Client Mentions, Client Link, Images, Link Requests, and URL Suggestion
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('setup')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'setup'
                  ? 'border-blue-500 text-blue-600'
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
                  ? 'border-blue-500 text-blue-600'
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
                  ? 'border-blue-500 text-blue-600'
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Content *
              </label>
              <textarea
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                placeholder="Paste your complete article here..."
                className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                disabled={isProcessing}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Post Site *
                </label>
                <input
                  type="text"
                  value={guestPostSite}
                  onChange={(e) => setGuestPostSite(e.target.value)}
                  placeholder="example.com"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Keyword *
                </label>
                <input
                  type="text"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  placeholder="main keyword phrase"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client Brand Name"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Domain *
                </label>
                <input
                  type="text"
                  value={targetDomain}
                  onChange={(e) => setTargetDomain(e.target.value)}
                  placeholder="client-website.com"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client URL *
                </label>
                <input
                  type="url"
                  value={clientUrl}
                  onChange={(e) => setClientUrl(e.target.value)}
                  placeholder="https://client-website.com/target-page"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suggested Anchor Text
                </label>
                <input
                  type="text"
                  value={anchorText}
                  onChange={(e) => setAnchorText(e.target.value)}
                  placeholder="Optional - AI will choose if not provided"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
            </div>

            <button
              onClick={handleOrchestrate}
              disabled={isProcessing || !article || !targetDomain || !clientName || !clientUrl || !guestPostSite || !targetKeyword}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Start Link Orchestration
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
      </div>
    </div>
  );
};

export default LinkOrchestrationStep;
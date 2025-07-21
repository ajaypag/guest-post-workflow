'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, AlertCircle, Clock, FileText, Brain, RefreshCw } from 'lucide-react';
import { CostConfirmationDialog } from './CostConfirmationDialog';

interface AgenticArticleGeneratorV2Props {
  workflowId: string;
  outline: string;
  onComplete: (article: string) => void;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
}

interface SessionProgress {
  session: {
    id: string;
    status: 'orchestrating' | 'writing' | 'completed' | 'failed';
    totalSections: number;
    completedSections: number;
    currentWordCount: number;
    totalWordCount: number;
    outline?: string;
    finalArticle?: string;
    errorMessage?: string;
  };
  progress: {
    status: string;
    currentSection?: string;
    totalSections?: number;
    completedSections?: number;
    currentWordCount?: number;
  };
}

export const AgenticArticleGeneratorV2 = ({ workflowId, outline, onComplete, onGeneratingStateChange }: AgenticArticleGeneratorV2Props) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [completedSections, setCompletedSections] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Report generating state changes to parent
  useEffect(() => {
    onGeneratingStateChange?.(isGenerating);
  }, [isGenerating, onGeneratingStateChange]);

  const handleStartClick = () => {
    if (!outline.trim()) {
      setError('Please complete Deep Research step first to get the outline.');
      return;
    }
    
    // Disable button immediately to prevent double-clicks
    setIsButtonDisabled(true);
    
    // Show cost confirmation dialog
    setShowCostDialog(true);
  };

  const startGeneration = async () => {
    setShowCostDialog(false);
    setIsGenerating(true);
    setError(null);
    setLogs([]);
    setCompletedSections(0); // Reset completed sections count
    addLog('🚀 Starting V2 LLM orchestration...');

    try {
      // Start V2 generation
      const response = await fetch(`/api/workflows/${workflowId}/auto-generate-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start V2 generation');
      }

      setSessionId(result.sessionId);
      addLog(`✨ V2 session created: ${result.sessionId}`);
      
      // Start SSE connection for real-time updates
      startEventStream(result.sessionId);

    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
      setIsButtonDisabled(false);
      addLog(`❌ Error: ${err.message}`);
    }
  };

  const startEventStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/auto-generate-v2/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            addLog('🔌 Connected to V2 real-time updates');
            break;
            
          case 'status':
            addLog(`🤖 ${data.message}`);
            break;
            
          case 'outline_created':
            addLog(`📋 Orchestrator created outline with ${data.totalSections} sections`);
            break;
            
          case 'section_started':
            addLog(`✍️ Writer agent starting: "${data.sectionTitle}"`);
            break;
            
          case 'section_completed':
            setCompletedSections(data.sectionNumber || 0);
            addLog(`✅ Completed section ${data.sectionNumber}`);
            break;
            
          case 'progress':
            setProgress(data);
            
            // Log status changes
            if (data.session.status === 'orchestrating') {
              if (!progress || progress.session.status !== 'orchestrating') {
                addLog('🧠 Orchestrator analyzing research and planning article...');
              }
            } else if (data.session.status === 'writing') {
              if (!progress || progress.session.status !== 'writing') {
                addLog('📝 Writer agent crafting article sections...');
              }
            }
            break;
            
          case 'complete':
          case 'completed':
            setIsGenerating(false);
            eventSource.close();
            
            if (data.status === 'completed') {
              addLog('🎉 V2 article generation completed successfully!');
              
              if (data.finalArticle) {
                const wordCount = data.finalArticle.split(/\s+/).filter((w: string) => w).length;
                addLog(`📊 Final article: ${wordCount} words`);
                onComplete(data.finalArticle);
              } else {
                addLog('⚠️ Warning: No final article received from server');
                setError('No final article received from server');
              }
            } else {
              addLog(`❌ Generation failed: ${data.errorMessage || 'Unknown error'}`);
              setError(data.errorMessage || 'Generation failed');
            }
            break;
            
          case 'error':
            setError(data.message);
            setIsGenerating(false);
            eventSource.close();
            addLog(`❌ Error: ${data.message}`);
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      addLog('🔄 Connection lost, attempting to reconnect...');
    };
  };

  const stopGeneration = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsGenerating(false);
    addLog('⏹️ Generation stopped by user');
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'orchestrating':
        return <Brain className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'writing':
        return <FileText className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Don't calculate percentage when we don't know total sections
  const hasKnownTotal = progress?.session.totalSections && progress.session.totalSections > 0;
  const progressPercentage = hasKnownTotal
    ? Math.round((progress.session.completedSections / progress.session.totalSections) * 100) 
    : 0;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Agent V2 - LLM Orchestration</h3>
            <p className="text-sm text-gray-600">Natural article generation using multi-agent orchestration</p>
          </div>
        </div>
        
        {!isGenerating ? (
          <button
            onClick={handleStartClick}
            disabled={!outline.trim() || isButtonDisabled}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <Play className="w-4 h-4" />
            <span>Start V2 Generation</span>
          </button>
        ) : (
          <button
            onClick={stopGeneration}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md"
          >
            <Pause className="w-4 h-4" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-800">{error}</p>
                <p className="text-xs text-red-600 mt-1">
                  Note: If the article generated successfully in the logs, this may be a false error. Try refreshing.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              title="Refresh page"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {progress && (
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(progress.session.status)}
                <span className="font-medium text-gray-900 capitalize">{progress.session.status}</span>
              </div>
              <span className="text-sm text-gray-600">
                {hasKnownTotal 
                  ? `${progressPercentage}% Complete`
                  : `${progress.session.completedSections} sections completed`
                }
              </span>
            </div>
            
            {/* Progress Bar - only show when we know the total */}
            {hasKnownTotal && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
            
            {/* Stats */}
            <div className="text-sm">
              <span className="text-gray-500">Sections:</span>
              <span className="ml-2 font-medium">
                {hasKnownTotal 
                  ? `${progress.session.completedSections} / ${progress.session.totalSections}`
                  : `${progress.session.completedSections} completed`
                }
              </span>
            </div>
          </div>

          {/* Current Activity */}
          {progress.progress.currentSection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Currently writing:</span> {progress.progress.currentSection}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Activity Log</h4>
          <div className="bg-white/60 backdrop-blur border border-purple-200 text-gray-800 text-xs p-3 rounded-lg max-h-40 overflow-y-auto font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isGenerating && !progress && (
        <div className="bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-300 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-2">V2 LLM Orchestration Approach:</h4>
          <ol className="text-sm text-purple-800 space-y-1">
            <li>1. <strong>Orchestrator Agent</strong> reads research and plans natural article flow</li>
            <li>2. <strong>Writer Agent</strong> receives minimal instructions per section</li>
            <li>3. Creates conversational, non-AI-sounding content</li>
            <li>4. Follows the "magic" of manual ChatGPT.com workflow</li>
            <li>5. Real-time updates show the orchestration process</li>
          </ol>
          <p className="text-xs text-purple-700 mt-2 italic">
            This V2 approach produces more natural, human-like articles compared to V1.
          </p>
        </div>
      )}

      {/* Cost Confirmation Dialog */}
      <CostConfirmationDialog
        isOpen={showCostDialog}
        onClose={() => {
          setShowCostDialog(false);
          setIsButtonDisabled(false);
        }}
        onConfirm={startGeneration}
        title="Start V2 Article Generation"
        description="This will use the new LLM orchestration approach with multiple agents working together to create a natural-sounding article."
        estimatedCost="$1.00 - $3.00"
        warningMessage="V2 uses advanced orchestration which may cost slightly more but produces significantly better quality. You can stop the generation at any time."
      />
    </div>
  );
};
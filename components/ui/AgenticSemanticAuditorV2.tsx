'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, AlertCircle, Clock, FileText, Search } from 'lucide-react';
import { CostConfirmationDialog } from './CostConfirmationDialog';
import ReactMarkdown from 'react-markdown';

interface AgenticSemanticAuditorV2Props {
  workflowId: string;
  originalArticle: string;
  researchOutline: string;
  onComplete: (auditedArticle: string) => void;
}

interface SessionProgress {
  session: {
    id: string;
    status: 'initializing' | 'auditing' | 'completed' | 'failed';
    completedSections: number;
    errorMessage?: string;
  };
  progress: {
    status: string;
    completedSections: number;
  };
}

export const AgenticSemanticAuditorV2 = ({ 
  workflowId, 
  originalArticle, 
  researchOutline,
  onComplete 
}: AgenticSemanticAuditorV2Props) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [intermediaryContent, setIntermediaryContent] = useState(''); // Streaming markdown content
  const [finalArticle, setFinalArticle] = useState(''); // Clean parsed article
  const [showRendered, setShowRendered] = useState(false);
  const [showIntermediaryView, setShowIntermediaryView] = useState(false); // Toggle between final and analysis view
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleStartClick = () => {
    if (!originalArticle.trim()) {
      setError('Please complete Article Draft step first to get the article.');
      return;
    }
    
    // Disable button immediately to prevent double-clicks
    setIsButtonDisabled(true);
    
    // Show cost confirmation dialog
    setShowCostDialog(true);
  };

  const startAudit = async () => {
    setShowCostDialog(false);
    setIsAuditing(true);
    setError(null);
    setLogs([]);
    setIntermediaryContent(''); // Clear streaming content
    setFinalArticle(''); // Clear final article
    addLog('🚀 Starting V2 semantic SEO audit...');

    try {
      // Start V2 audit
      const response = await fetch(`/api/workflows/${workflowId}/semantic-audit-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalArticle, researchOutline })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start V2 audit');
      }

      setSessionId(result.sessionId);
      addLog(`✨ V2 audit session created: ${result.sessionId}`);
      
      // Start SSE connection for real-time updates
      startEventStream(result.sessionId);

    } catch (err: any) {
      setError(err.message);
      setIsAuditing(false);
      setIsButtonDisabled(false);
      addLog(`❌ Error: ${err.message}`);
    }
  };

  const startEventStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/semantic-audit-v2/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            addLog('🔌 Connected to V2 audit real-time updates');
            break;
            
          case 'status':
            addLog(`🔍 ${data.message}`);
            break;
            
          case 'text':
            // Accumulate intermediary content (with markdown headers)
            setIntermediaryContent(prev => prev + data.content);
            break;
            
          case 'section_completed':
            addLog(`✅ Completed section ${data.sectionsCompleted}`);
            break;
            
          case 'progress':
            setProgress(data);
            
            // Log status changes
            if (data.session.status === 'auditing') {
              if (!progress || progress.session.status !== 'auditing') {
                addLog('📝 Auditor reviewing article section by section...');
              }
            }
            break;
            
          case 'complete':
            setIsAuditing(false);
            eventSource.close();
            
            if (data.status === 'completed') {
              addLog('🎉 V2 semantic audit completed successfully!');
              
              // Handle both intermediary and final content
              if (data.intermediaryContent) {
                setIntermediaryContent(data.intermediaryContent);
              }
              
              if (data.finalArticle) {
                const wordCount = data.finalArticle.split(/\s+/).filter((w: string) => w).length;
                addLog(`📊 Final audited article: ${wordCount} words`);
                setFinalArticle(data.finalArticle);
                onComplete(data.finalArticle); // Pass clean article to parent
              } else {
                addLog('⚠️ Warning: No audited article received from server');
                setError('No audited article received from server');
              }
            } else {
              addLog(`❌ Audit failed: ${data.errorMessage || 'Unknown error'}`);
              setError(data.errorMessage || 'Audit failed');
            }
            break;
            
          case 'error':
            setError(data.message);
            setIsAuditing(false);
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

  const stopAudit = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsAuditing(false);
    addLog('⏹️ Audit stopped by user');
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
      case 'auditing':
        return <Search className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'initializing':
        return <FileText className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Agent V2 - Semantic SEO Audit</h3>
            <p className="text-sm text-gray-600">Natural audit flow using LLM orchestration</p>
          </div>
        </div>
        
        {!isAuditing ? (
          <button
            onClick={handleStartClick}
            disabled={!originalArticle.trim() || isButtonDisabled}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <Play className="w-4 h-4" />
            <span>Start V2 Audit</span>
          </button>
        ) : (
          <button
            onClick={stopAudit}
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
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {progress && (
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(progress.session.status)}
                <span className="font-medium text-gray-900 capitalize">{progress.session.status}</span>
              </div>
              <span className="text-sm text-gray-600">
                {progress.session.completedSections} sections audited
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Audit Content Display */}
      {(intermediaryContent || finalArticle) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {finalArticle ? 'Final Audited Article' : 'Audit Progress (Live)'}
            </h4>
            <div className="flex items-center space-x-2">
              {finalArticle && intermediaryContent && (
                <button
                  onClick={() => setShowIntermediaryView(!showIntermediaryView)}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  {showIntermediaryView ? 'Show Final' : 'Show Analysis'}
                </button>
              )}
              <button
                onClick={() => setShowRendered(!showRendered)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showRendered ? 'Show Raw' : 'Show Rendered'}
              </button>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur border border-blue-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            {showRendered ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>
                  {showIntermediaryView ? intermediaryContent : (finalArticle || intermediaryContent)}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                {showIntermediaryView ? intermediaryContent : (finalArticle || intermediaryContent)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Activity Log</h4>
          <div className="bg-white/60 backdrop-blur border border-blue-200 text-gray-800 text-xs p-3 rounded-lg max-h-40 overflow-y-auto font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isAuditing && !progress && (
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-300 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">V2 Semantic SEO Audit Approach:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. <strong>Single Agent</strong> reads article with semantic SEO knowledge</li>
            <li>2. Works through each section systematically</li>
            <li>3. Provides strengths, weaknesses, and optimized content</li>
            <li>4. Uses end marker to know when complete</li>
            <li>5. Creates natural, conversational audit flow</li>
          </ol>
          <p className="text-xs text-blue-700 mt-2 italic">
            This V2 approach matches the ChatGPT.com experience with simple prompting.
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
        onConfirm={startAudit}
        title="Start V2 Semantic SEO Audit"
        description="This will use the new LLM orchestration approach to audit your article section by section for semantic SEO optimization."
        estimatedCost="$0.50 - $1.50"
        warningMessage="V2 uses a natural conversation flow which produces better quality audits. You can stop the audit at any time."
      />
    </div>
  );
};
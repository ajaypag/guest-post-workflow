'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertTriangle, RefreshCw, FileText, StopCircle } from 'lucide-react';

interface AgenticFinalPolisherV2Props {
  workflowId: string;
  onComplete?: (polishedArticle: string) => void;
}

interface PolishProgress {
  type: string;
  status?: string;
  message?: string;
  phase?: string;
  content?: string | {
    strengths: string[];
    weaknesses: string[];
    updatedSection: string;
  };
  sectionNumber?: number;
  finalPolishedArticle?: string;
  polishedSections?: Array<{
    strengths: string[];
    weaknesses: string[];
    updatedSection: string;
  }>;
  wordCount?: number;
  totalSections?: number;
  error?: string;
}

export const AgenticFinalPolisherV2: React.FC<AgenticFinalPolisherV2Props> = ({
  workflowId,
  onComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<PolishProgress | null>(null);
  const [finalArticle, setFinalArticle] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [completedSections, setCompletedSections] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [polishedSections, setPolishedSections] = useState<Array<{
    strengths: string[];
    weaknesses: string[];
    updatedSection: string;
  }>>([]);

  // Start the V2 polish process
  const startPolish = async () => {
    try {
      setIsRunning(true);
      setError('');
      setProgress(null);
      setFinalArticle('');
      setCompletedSections(0);
      setCurrentPhase('');
      setStreamingText('');
      setIsStreaming(false);
      setPolishedSections([]);

      console.log('🎨 Starting V2 polish process...');

      // Start the polish session
      const response = await fetch(`/api/workflows/${workflowId}/final-polish-v2/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start V2 polish');
      }

      setSessionId(data.sessionId);
      console.log('✅ V2 Polish session started:', data.sessionId);

      // Start listening to SSE stream
      startSSEStream(data.sessionId);

    } catch (error: any) {
      console.error('❌ Error starting V2 polish:', error);
      setError(error.message || 'Failed to start polish process');
      setIsRunning(false);
    }
  };

  // Cancel the polish process
  const cancelPolish = async () => {
    if (!sessionId) return;
    
    setIsCancelling(true);
    
    try {
      const response = await fetch(`/api/workflows/${workflowId}/polish-v2/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel polish');
      }
      
      console.log('🛑 Polish cancelled successfully');
      setIsRunning(false);
      setError('Polish operation cancelled by user');
    } catch (error) {
      console.error('Error cancelling polish:', error);
      setError('Failed to cancel polish operation');
    } finally {
      setIsCancelling(false);
    }
  };

  // Start SSE stream for real-time updates
  const startSSEStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/final-polish-v2/stream?sessionId=${sessionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data: PolishProgress = JSON.parse(event.data);
        console.log('📡 V2 Polish SSE update:', data);
        
        setProgress(data);
        handleProgressUpdate(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      eventSource.close();
      setIsRunning(false);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  };

  // Handle different types of progress updates
  const handleProgressUpdate = (data: PolishProgress) => {
    switch (data.type) {
      case 'connected':
        console.log('🔗 Connected to V2 polish stream');
        break;

      case 'status':
        console.log(`📊 Status: ${data.status} - ${data.message}`);
        break;

      case 'phase':
        console.log(`🔄 Phase: ${data.phase} - ${data.message}`);
        setCurrentPhase(data.message || '');
        break;

      case 'text':
        // Text streaming - append to current streaming text
        setIsStreaming(true);
        setStreamingText(prev => prev + (data.content || ''));
        break;

      case 'section_completed':
        console.log(`✅ Section ${data.sectionNumber} completed`);
        setCompletedSections(data.sectionNumber || 0);
        setStreamingText(''); // Clear streaming text after section completes
        setIsStreaming(false);
        
        // Add the section data to our polished sections array
        if (data.content && typeof data.content === 'object' && 'strengths' in data.content) {
          setPolishedSections(prev => [...prev, data.content as any]);
        }
        break;

      case 'completed':
        console.log('🎉 V2 Polish completed!');
        setFinalArticle(data.finalPolishedArticle || '');
        setIsRunning(false);
        
        // Update polished sections if provided
        if (data.polishedSections) {
          setPolishedSections(data.polishedSections);
        }
        
        if (onComplete && data.finalPolishedArticle) {
          onComplete(data.finalPolishedArticle);
        }
        break;

      case 'error':
        console.error('❌ Polish error:', data.error);
        setError(data.error || 'An error occurred during polish');
        setIsRunning(false);
        break;
        
      case 'cancelled':
        console.log('🛑 Polish cancelled:', data.message);
        setIsRunning(false);
        setError(data.message || 'Operation cancelled');
        break;
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-600 rounded-full p-2">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Agentic Polish V2</h3>
            <p className="text-sm text-purple-700">
              Single-prompt pattern for brand alignment
            </p>
          </div>
        </div>
        
        {!isRunning && !finalArticle && (
          <button
            onClick={startPolish}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Start Polish V2</span>
          </button>
        )}
        
        {isRunning && (
          <button
            onClick={cancelPolish}
            disabled={isCancelling}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StopCircle className="w-4 h-4" />
            <span>{isCancelling ? 'Cancelling...' : 'Emergency Stop'}</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-red-700 text-sm font-medium">Error</p>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Progress Display */}
      {isRunning && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                {currentPhase || 'Processing...'}
              </span>
            </div>
            {completedSections > 0 && (
              <span className="text-xs text-purple-600">
                {completedSections} sections polished
              </span>
            )}
          </div>
          
          <div className="bg-white border border-purple-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              <strong>Single-Prompt Loop:</strong> Analyze & Polish → Next Section → Analyze & Polish...
            </p>
          </div>
          
          {/* Streaming Text Display */}
          {isStreaming && streamingText && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="text-sm font-mono whitespace-pre-wrap text-gray-700">
                {streamingText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Final Results */}
      {finalArticle && !isRunning && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-purple-900 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>V2 Polish Complete</span>
            </h4>
            {progress?.totalSections && (
              <span className="text-sm text-gray-600">
                {progress.totalSections} sections polished
              </span>
            )}
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>Successfully balanced brand voice with semantic clarity</strong>
              {progress?.wordCount && (
                <span className="block mt-1 text-xs">
                  Final word count: {progress.wordCount}
                </span>
              )}
            </p>
          </div>
          
          {/* Polish Analysis Summary */}
          {polishedSections.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              <h5 className="font-medium text-purple-900 mb-2">Polish Analysis Summary</h5>
              <div className="space-y-3 text-sm">
                {polishedSections.map((section, idx) => (
                  <div key={idx} className="border-b border-purple-100 pb-2 last:border-0">
                    <p className="font-medium text-purple-800 mb-1">Section {idx + 1}</p>
                    {section.strengths.length > 0 && (
                      <div className="text-green-700 text-xs mb-1">
                        ✓ {section.strengths.join(', ')}
                      </div>
                    )}
                    {section.weaknesses.length > 0 && (
                      <div className="text-red-700 text-xs">
                        ✗ {section.weaknesses.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-white border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Polished Article</span>
              </h5>
              <button
                onClick={() => navigator.clipboard.writeText(finalArticle)}
                className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
              >
                Copy Article
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto bg-gray-50 p-3 rounded border text-sm font-mono whitespace-pre-wrap">
              {finalArticle}
            </div>
          </div>
        </div>
      )}

      {/* Helper Text */}
      {!isRunning && !finalArticle && !error && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <RefreshCw className="w-8 h-8 mx-auto mb-2" />
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Ready to polish your SEO-optimized article
          </p>
          <p className="text-xs text-gray-500">
            V2 uses conversation flow: Kickoff → Single-prompt loop per section
          </p>
        </div>
      )}
    </div>
  );
};
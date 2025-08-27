'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, CheckCircle, AlertCircle, Clock, Loader2, Copy, XCircle, Sparkles } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';

interface AgenticOutlineGeneratorV2Props {
  workflowId: string;
  onComplete?: (outline: string) => void;
}

type Status = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error' | 'cancelled';

export function AgenticOutlineGeneratorV2({ workflowId, onComplete }: AgenticOutlineGeneratorV2Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [outline, setOutline] = useState<string>('');
  const [citations, setCitations] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Intelligence state
  const [intelligenceType, setIntelligenceType] = useState<'none' | 'brand' | 'target'>('none');
  const [workflowMetadata, setWorkflowMetadata] = useState<any>(null);

  // Load existing session on mount
  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/workflows/${workflowId}/outline-generation/latest`);
        
        if (!response.ok) {
          throw new Error('Failed to load existing session');
        }
        
        const data = await response.json();
        
        if (data.success && data.session) {
          const session = data.session;
          console.log('Loading existing outline session:', session.id);
          
          setSessionId(session.id);
          
          if (session.status === 'completed' && session.outline) {
            setStatus('completed');
            setOutline(session.outline);
            setCitations(session.citations || []);
            
            if (onComplete) {
              onComplete(session.outline);
            }
          } else if (['queued', 'in_progress'].includes(session.status)) {
            // Resume polling for in-progress sessions
            setStatus(session.status as Status);
            startPolling(session.id);
          }
        }
      } catch (error) {
        console.error('Error loading existing session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExistingSession();
    
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [workflowId]);

  // Load workflow metadata and intelligence information
  useEffect(() => {
    const loadWorkflowIntelligence = async () => {
      try {
        // Get workflow metadata
        const response = await fetch(`/api/workflows/${workflowId}`);
        if (!response.ok) return;
        
        const workflow = await response.json();
        setWorkflowMetadata(workflow.metadata);
        
        if (!workflow.metadata) {
          setIntelligenceType('none');
          return;
        }
        
        let intelligenceFound = false;
        
        // 1. Check for target page intelligence first
        const targetPageId = workflow.metadata?.siteSelectionId;
        if (targetPageId) {
          try {
            const targetResponse = await fetch(`/api/target-pages/${targetPageId}/intelligence/latest`);
            if (targetResponse.ok) {
              const targetData = await targetResponse.json();
              if (targetData.session?.finalBrief) {
                setIntelligenceType('target');
                intelligenceFound = true;
              }
            }
          } catch (error) {
            console.error('Failed to load target page intelligence:', error);
          }
        }
        
        // 2. Fall back to brand intelligence if no target intelligence
        if (!intelligenceFound && workflow.metadata?.clientId) {
          try {
            const brandResponse = await fetch(`/api/clients/${workflow.metadata.clientId}/brand-intelligence/latest`);
            if (brandResponse.ok) {
              const brandData = await brandResponse.json();
              if (brandData.session?.finalBrief) {
                setIntelligenceType('brand');
                intelligenceFound = true;
              }
            }
          } catch (error) {
            console.error('Failed to load brand intelligence:', error);
          }
        }
        
        if (!intelligenceFound) {
          setIntelligenceType('none');
        }
        
      } catch (error) {
        console.error('Error loading workflow intelligence:', error);
        setIntelligenceType('none');
      }
    };

    loadWorkflowIntelligence();
  }, [workflowId]);

  const startGeneration = async () => {
    try {
      setStatus('queued');
      setError('');
      setProgress('Starting deep research in background mode...');

      const response = await fetch(`/api/workflows/${workflowId}/outline-generation/start-v2`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start outline generation');
      }

      const data = await response.json();
      
      // Check if generation is already active
      if (data.status === 'already_active') {
        setSessionId(data.existingSessionId);
        setStatus('in_progress');
        setProgress('Resuming existing research that is already in progress...');
        // Start polling for the existing session
        startPolling(data.existingSessionId);
      } else {
        setSessionId(data.sessionId);
        // Start polling for status updates
        startPolling(data.sessionId);
      }

    } catch (err: any) {
      console.error('Error starting generation:', err);
      setStatus('error');
      setError(err.message);
    }
  };

  const startPolling = (sessionId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/workflows/${workflowId}/outline-generation/status?sessionId=${sessionId}`
        );

        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const data = await response.json();
        setPollingCount(prev => prev + 1);

        // Update status
        setStatus(data.status as Status);
        
        if (data.progress) {
          setProgress(data.progress);
        }

        // Handle completion
        if (data.status === 'completed' && data.outline) {
          setOutline(data.outline);
          setCitations(data.citations || []);
          setProgress('Research completed successfully!');
          
          if (onComplete) {
            onComplete(data.outline);
          }
          
          // Stop polling
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
        }

        // Handle error
        if (data.status === 'error' || data.error) {
          setError(data.error || 'An error occurred');
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
        }

      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling even on error
      }
    }, 5000); // Poll every 5 seconds

    pollingIntervalRef.current = pollInterval;
  };

  const cancelGeneration = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}/outline-generation/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel');
      }

      setStatus('cancelled');
      setProgress('Research cancelled');
      
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

    } catch (error) {
      console.error('Error cancelling generation:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outline);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-2">
          <Bot className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI-Powered Deep Research</h3>
        </div>
        <p className="text-sm text-gray-600">
          Uses OpenAI's o3 deep research model to create comprehensive, well-researched outlines.
          This process typically takes 10-15 minutes.
        </p>
      </div>

      {/* Intelligence Integration Indicators */}
      {intelligenceType === 'target' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-sm font-medium text-purple-900">
            🎯 Using Target URL Intelligence for enhanced research
          </p>
          <p className="text-xs text-purple-700 mt-1">
            AI will use deep intelligence about this specific page to create more relevant outlines
          </p>
        </div>
      )}

      {intelligenceType === 'brand' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900">
            🏢 Using Brand Intelligence for enhanced research
          </p>
          <p className="text-xs text-blue-700 mt-1">
            AI will use comprehensive brand knowledge to create more accurate outlines
          </p>
        </div>
      )}

      {intelligenceType === 'none' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-700">
            ℹ️ Using standard research mode
          </p>
          <p className="text-xs text-gray-600 mt-1">
            AI will conduct basic research without additional business intelligence
          </p>
        </div>
      )}

      {/* Status Display */}
      {status !== 'idle' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {status === 'queued' && <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />}
              {status === 'in_progress' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
              {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {status === 'cancelled' && <XCircle className="w-5 h-5 text-gray-500" />}
              
              <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
            </div>

            {['queued', 'in_progress'].includes(status) && (
              <button
                onClick={cancelGeneration}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Progress Message */}
          {progress && (
            <p className="text-sm text-gray-600 mb-2">{progress}</p>
          )}

          {/* Polling indicator */}
          {['queued', 'in_progress'].includes(status) && (
            <div className="text-xs text-gray-500">
              Checking status... (#{pollingCount}) • Elapsed: {formatTime(pollingCount * 5)}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Start Button */}
      {status === 'idle' && (
        <button
          onClick={startGeneration}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Bot className="w-5 h-5" />
          <span>Start AI Deep Research</span>
        </button>
      )}

      {/* Results */}
      {status === 'completed' && outline && (
        <div className="space-y-4">
          {/* Raw Text View */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Raw Outline (Copy this to Step 3)</h4>
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <Copy className="w-4 h-4" />
                <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={outline}
                readOnly
                className="w-full h-64 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none"
              />
            </div>
          </div>

          {/* Formatted Preview */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 px-4 py-3">
              <h4 className="font-medium text-gray-900">Formatted Preview</h4>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <MarkdownPreview content={outline} />
            </div>
          </div>

          {/* Citations */}
          {citations.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Sources & Citations</h4>
              <ul className="space-y-1">
                {citations.map((citation, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    {citation.type === 'url' ? (
                      <a href={citation.value} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        {citation.value}
                      </a>
                    ) : (
                      <span>• {citation.value}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Regenerate Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={startGeneration}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate New Outline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
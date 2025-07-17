'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, AlertCircle, CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface AgenticOutlineGeneratorV3Props {
  workflowId: string;
  outlinePrompt: string;
  onOutlineGenerated: (outline: string, citations: any[]) => void;
  enabled?: boolean;
}

export function AgenticOutlineGeneratorV3({
  workflowId,
  outlinePrompt,
  onOutlineGenerated,
  enabled = true
}: AgenticOutlineGeneratorV3Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partialOutline, setPartialOutline] = useState<string>('');
  const [finalOutline, setFinalOutline] = useState<string | null>(null);
  const [citations, setCitations] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sequenceNumber, setSequenceNumber] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectToStream = useCallback((sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log(`🔌 Connecting to stream for session ${sessionId}...`);
    
    const eventSource = new EventSource(
      `/api/workflows/${workflowId}/outline-generation/stream?sessionId=${sessionId}&sequence=${sequenceNumber}`
    );
    
    eventSourceRef.current = eventSource;
    setIsConnected(true);
    setReconnectAttempts(0);

    eventSource.onopen = () => {
      console.log('✅ Stream connected');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Stream event:', data.type);

        // Update sequence number
        if (data.sequenceNumber !== undefined) {
          setSequenceNumber(data.sequenceNumber);
        }

        switch (data.type) {
          case 'status':
            setStatus(data.message || data.status);
            break;
            
          case 'content_delta':
            setPartialOutline(data.partialContent || '');
            setStatus(data.message || 'Streaming research content...');
            break;
            
          case 'completed':
            setFinalOutline(data.outline);
            setCitations(data.citations || []);
            setStatus('Research completed successfully!');
            setIsGenerating(false);
            onOutlineGenerated(data.outline, data.citations || []);
            eventSource.close();
            setIsConnected(false);
            break;
            
          case 'error':
            setError(data.error || 'An error occurred');
            setIsGenerating(false);
            eventSource.close();
            setIsConnected(false);
            break;
            
          case 'cancelled':
            setStatus('Research cancelled');
            setIsGenerating(false);
            eventSource.close();
            setIsConnected(false);
            break;
        }
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('❌ Stream error:', err);
      setIsConnected(false);
      eventSource.close();

      // Implement reconnection logic
      if (isGenerating && reconnectAttempts < 3) {
        setReconnectAttempts(prev => prev + 1);
        setStatus(`Connection lost. Reconnecting... (attempt ${reconnectAttempts + 1}/3)`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToStream(sessionId);
        }, 2000 * (reconnectAttempts + 1)); // Exponential backoff
      } else if (reconnectAttempts >= 3) {
        setError('Failed to maintain connection after 3 attempts');
        setIsGenerating(false);
      }
    };
  }, [workflowId, sequenceNumber, isGenerating, reconnectAttempts, onOutlineGenerated]);

  const startGeneration = async () => {
    if (!enabled || !outlinePrompt.trim()) {
      setError('Please provide an outline prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus('Initializing deep research with streaming...');
    setPartialOutline('');
    setFinalOutline(null);
    setCitations([]);
    setSequenceNumber(0);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/outline-generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          outlinePrompt,
          useStreaming: true // Force V3 streaming
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start outline generation');
      }

      if (data.status === 'already_active') {
        setError('An outline generation is already in progress for this workflow.');
        setIsGenerating(false);
        return;
      }

      setSessionId(data.sessionId);
      setStatus(data.message || 'Research started');
      
      // Connect to SSE stream
      connectToStream(data.sessionId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsGenerating(false);
    }
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
        throw new Error('Failed to cancel generation');
      }

      setIsGenerating(false);
      setStatus('Cancelled by user');
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsConnected(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const reconnect = () => {
    if (sessionId && !isConnected) {
      setReconnectAttempts(0);
      connectToStream(sessionId);
    }
  };

  const displayContent = finalOutline || partialOutline;

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Outline Generator (Streaming v3)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Deep research-based outline generation with real-time streaming results
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Connected (sequence: {sequenceNumber})</span>
            </>
          ) : sessionId ? (
            <>
              <WifiOff className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-600">Disconnected</span>
              <button
                onClick={reconnect}
                className="h-6 px-2 text-sm hover:bg-gray-100 rounded"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </button>
            </>
          ) : null}
        </div>

        {/* Status Display */}
        {status && (
          <div className={`p-4 rounded-lg border ${error ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              {error ? (
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              ) : isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mt-0.5"></div>
              ) : finalOutline ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5" />
              )}
              <p className="text-sm">
                {error || status}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={startGeneration}
            disabled={!enabled || isGenerating || !outlinePrompt.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Research Outline'}
          </button>
          
          {isGenerating && (
            <button
              onClick={cancelGeneration}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Streaming Content Display */}
        {displayContent && (
          <div className="mt-6 space-y-4">
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-2">
                {finalOutline ? 'Generated Outline' : 'Streaming Research Content...'}
              </h3>
              <div className={`border rounded-lg p-4 ${!finalOutline ? 'border-blue-200 bg-blue-50' : ''}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  className="whitespace-pre-wrap"
                >
                  {displayContent}
                </ReactMarkdown>
                {!finalOutline && partialOutline && (
                  <div className="mt-2 flex items-center gap-2 text-blue-600">
                    <div className="animate-pulse">●</div>
                    <span className="text-sm">Streaming in progress...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Citations */}
            {citations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Research Sources</h3>
                <div className="space-y-1">
                  {citations.map((citation, index) => (
                    <div key={index} className="text-sm">
                      {citation.type === 'url' ? (
                        <a
                          href={citation.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {citation.value}
                        </a>
                      ) : (
                        <span className="text-gray-600">{citation.value}</span>
                      )}
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
}
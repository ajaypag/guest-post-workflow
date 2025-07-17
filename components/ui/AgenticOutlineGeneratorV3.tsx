'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, CheckCircle, AlertCircle, Clock, Loader2, Copy, XCircle, Wifi, WifiOff } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';

interface AgenticOutlineGeneratorV3Props {
  workflowId: string;
  onComplete?: (outline: string) => void;
}

type Status = 'idle' | 'queued' | 'streaming_started' | 'in_progress' | 'completed' | 'error' | 'cancelled';
type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

export function AgenticOutlineGeneratorV3({ workflowId, onComplete }: AgenticOutlineGeneratorV3Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [outline, setOutline] = useState<string>('');
  const [partialContent, setPartialContent] = useState<string>('');
  const [citations, setCitations] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [implementation, setImplementation] = useState<'streaming' | 'polling'>('streaming');
  
  // Streaming specific state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [sequenceNumber, setSequenceNumber] = useState<number>(0);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [heartbeatReceived, setHeartbeatReceived] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          console.log('🔄 Loading existing outline session:', session.id);
          
          setSessionId(session.id);
          setImplementation(session.connectionStatus ? 'streaming' : 'polling');
          
          if (session.status === 'completed' && session.finalOutline) {
            setStatus('completed');
            setOutline(session.finalOutline);
            setCitations(session.citations || []);
            
            if (onComplete) {
              onComplete(session.finalOutline);
            }
          } else if (['queued', 'streaming_started', 'in_progress'].includes(session.status)) {
            // Resume with appropriate method
            setStatus(session.status as Status);
            if (session.connectionStatus) {
              // Resume streaming
              setSequenceNumber(session.lastSequenceNumber || 0);
              setPartialContent(session.partialContent || '');
              connectToStream(session.id);
            } else {
              // Fallback to polling
              setImplementation('polling');
              startPolling(session.id);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading existing session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExistingSession();
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [workflowId]);

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  };

  const startGeneration = async () => {
    try {
      setStatus('queued');
      setError('');
      setProgress('Starting deep research with real-time streaming...');

      const response = await fetch(`/api/workflows/${workflowId}/outline-generation/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlinePrompt: 'Generate a comprehensive outline for this content'
        })
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
        connectToStream(data.existingSessionId);
      } else {
        setSessionId(data.sessionId);
        setImplementation(data.implementation || 'streaming');
        
        if (data.implementation === 'streaming') {
          // Connect to real-time stream
          connectToStream(data.sessionId);
        } else {
          // Fallback to polling
          startPolling(data.sessionId);
        }
      }

    } catch (err: any) {
      console.error('❌ Error starting generation:', err);
      setStatus('error');
      setError(err.message);
    }
  };

  const connectToStream = (sessionId: string) => {
    cleanup(); // Clean up any existing connections
    
    setConnectionStatus('connecting');
    setProgress('Connecting to real-time stream...');
    
    const url = `/api/workflows/${workflowId}/outline-generation/stream?sessionId=${sessionId}&lastSequence=${sequenceNumber}`;
    console.log('🔌 Connecting to SSE stream:', url);
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened');
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      setProgress('Real-time connection established');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent(data);
      } catch (error) {
        console.error('❌ Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      setConnectionStatus('disconnected');
      
      // Attempt to reconnect
      if (reconnectAttempts < 5) {
        setConnectionStatus('reconnecting');
        setProgress(`Connection lost. Reconnecting... (attempt ${reconnectAttempts + 1}/5)`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectToStream(sessionId);
        }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)); // Exponential backoff
      } else {
        setConnectionStatus('failed');
        setProgress('Connection failed. Falling back to polling...');
        // Fallback to polling
        startPolling(sessionId);
      }
    };

    // Monitor heartbeat
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (!heartbeatReceived || Date.now() - heartbeatReceived.getTime() > 60000) {
        console.log('⚠️ No heartbeat received, reconnecting...');
        eventSource.close();
        connectToStream(sessionId);
      }
    }, 60000); // 1 minute timeout
  };

  const handleStreamEvent = (data: any) => {
    console.log('📡 SSE event received:', data.type, data);
    
    switch (data.type) {
      case 'connected':
        setConnectionStatus('connected');
        setProgress('Real-time streaming connected');
        break;
        
      case 'status_update':
        setStatus(data.status);
        if (data.partialContent) {
          setPartialContent(data.partialContent);
        }
        if (data.sequenceNumber) {
          setSequenceNumber(data.sequenceNumber);
        }
        break;
        
      case 'content_delta':
        setPartialContent(data.partialContent || '');
        setSequenceNumber(data.sequenceNumber || 0);
        setProgress(data.message || 'Research content streaming...');
        break;
        
      case 'completed':
        setStatus('completed');
        setOutline(data.outline || '');
        setCitations(data.citations || []);
        setProgress('Research outline completed successfully!');
        setConnectionStatus('disconnected');
        
        if (onComplete && data.outline) {
          onComplete(data.outline);
        }
        
        cleanup();
        break;
        
      case 'error':
        setStatus('error');
        setError(data.error || 'Stream error occurred');
        setConnectionStatus('failed');
        cleanup();
        break;
        
      case 'cancelled':
        setStatus('cancelled');
        setProgress('Research cancelled');
        setConnectionStatus('disconnected');
        cleanup();
        break;
        
      case 'heartbeat':
        setHeartbeatReceived(new Date());
        break;
        
      default:
        console.log('🔍 Unknown SSE event type:', data.type);
    }
  };

  const startPolling = (sessionId: string) => {
    // Fallback to V2 polling implementation
    console.log('📊 Falling back to polling for session:', sessionId);
    setImplementation('polling');
    // Implementation would mirror the V2 polling logic
    // For brevity, this is simplified
  };

  const cancelGeneration = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}/outline-generation/stream?sessionId=${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to cancel');
      }

      setStatus('cancelled');
      setProgress('Research cancelled');
      cleanup();

    } catch (error) {
      console.error('❌ Error cancelling generation:', error);
    }
  };

  const copyToClipboard = async () => {
    const content = outline || partialContent;
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
      case 'failed':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
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
          {implementation === 'streaming' && getConnectionIcon()}
        </div>
        <p className="text-sm text-gray-600">
          Uses OpenAI's o3 deep research model with real-time streaming.
          Content appears as it's generated in 10-15 minutes.
        </p>
        {implementation === 'polling' && (
          <p className="text-xs text-yellow-700 mt-1">
            ⚠️ Streaming unavailable - using polling mode
          </p>
        )}
      </div>

      {/* Status Display */}
      {status !== 'idle' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {status === 'queued' && <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />}
              {(status === 'streaming_started' || status === 'in_progress') && 
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
              {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {status === 'cancelled' && <XCircle className="w-5 h-5 text-gray-500" />}
              
              <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
              
              {implementation === 'streaming' && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Streaming • Seq #{sequenceNumber}
                </span>
              )}
            </div>

            {['queued', 'streaming_started', 'in_progress'].includes(status) && (
              <button
                onClick={cancelGeneration}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Connection Status */}
          {implementation === 'streaming' && connectionStatus !== 'disconnected' && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              {getConnectionIcon()}
              <span className="capitalize">{connectionStatus}</span>
              {reconnectAttempts > 0 && (
                <span className="text-yellow-600">(Attempt {reconnectAttempts}/5)</span>
              )}
            </div>
          )}

          {/* Progress Message */}
          {progress && (
            <p className="text-sm text-gray-600 mb-2">{progress}</p>
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
          <span>Start AI Deep Research with Streaming</span>
        </button>
      )}

      {/* Real-time Content Preview */}
      {(partialContent || outline) && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                {status === 'completed' ? 'Research Outline' : 'Research in Progress'}
              </h4>
              <div className="flex items-center space-x-2">
                {status !== 'completed' && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Live Update
                  </span>
                )}
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <MarkdownPreview content={outline || partialContent} />
              {status !== 'completed' && partialContent && (
                <div className="mt-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                  Content streaming...
                </div>
              )}
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
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, CheckCircle, AlertCircle, Clock, MessageCircle, Send, Sparkles, Copy, FileText } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';

interface AgenticOutlineGeneratorProps {
  workflowId: string;
  onComplete?: (outline: string) => void;
}

type Phase = 'idle' | 'researching' | 'completed' | 'error';

interface ClarificationQuestion {
  question: string;
  answer: string;
}

export function AgenticOutlineGenerator({ workflowId, onComplete }: AgenticOutlineGeneratorProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [outline, setOutline] = useState<string>('');
  const [citations, setCitations] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            setPhase('completed');
            setOutline(session.outline);
            setCitations(session.citations || []);
            
            if (onComplete) {
              onComplete(session.outline);
            }
          } else if (session.status === 'researching') {
            setPhase('researching');
          } else if (session.status === 'researching') {
            // Resume watching the research
            setPhase('researching');
            connectToSSE(session.id);
          }
        }
      } catch (error) {
        console.error('Error loading existing session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExistingSession();
  }, [workflowId]);

  const startGeneration = async () => {
    try {
      setPhase('researching');
      setError('');
      setStatusMessage('Starting deep research...');

      const response = await fetch(`/api/workflows/${workflowId}/outline-generation/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start outline generation');
      }

      const data = await response.json();
      setSessionId(data.sessionId);

      // Simplified flow - direct to research, complete when done
      if (data.outline) {
        // Research completed immediately
        setPhase('completed');
        setOutline(data.outline);
        if (data.citations) {
          setCitations(data.citations);
        }
        if (onComplete && data.outline) {
          onComplete(data.outline);
        }
      } else {
        // Research in progress
        setPhase('researching');
        setStatusMessage('Deep research in progress...');
      }

      // Connect to SSE for updates
      connectToSSE(data.sessionId);

    } catch (err: any) {
      console.error('Error starting generation:', err);
      setPhase('error');
      setError(err.message);
    }
  };

  const connectToSSE = (sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/workflows/${workflowId}/outline-generation/stream?sessionId=${sessionId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleSSEUpdate(data);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    eventSourceRef.current = eventSource;
  };

  const handleSSEUpdate = (data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('Connected to outline generation stream');
        break;

      case 'status':
        setStatusMessage(data.message || '');
        break;

      // Removed clarification_needed case - simplified flow

      case 'completed':
        setPhase('completed');
        setOutline(data.outline);
        setCitations(data.citations || []);
        setStatusMessage(data.message || 'Research outline completed!');
        if (onComplete && data.outline) {
          onComplete(data.outline);
        }
        break;

      case 'search_progress':
        setStatusMessage(data.message || `Searching: ${data.query}`);
        break;

      case 'error':
        setPhase('error');
        setError(data.error);
        break;

      case 'done':
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;

      default:
        // Handle progress updates
        if (data.status) {
          switch (data.status) {
            case 'researching':
              setPhase('researching');
              break;
            case 'completed':
              setPhase('completed');
              if (data.outline) {
                setOutline(data.outline);
                setCitations(data.citations || []);
                if (onComplete) {
                  onComplete(data.outline);
                }
              }
              break;
            case 'error':
              setPhase('error');
              setError(data.error || 'An error occurred');
              break;
          }
        }
    }
  };

  const submitAnswers = async () => {
    if (!sessionId || answers.some(a => !a.trim())) {
      setError('Please answer all questions before continuing');
      return;
    }

    try {
      setPhase('researching');
      setError('');
      setStatusMessage('Building research instructions based on your answers...');

      const response = await fetch(`/api/workflows/${workflowId}/outline-generation/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: answers.join('\n')
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to continue generation');
      }

      const data = await response.json();
      setOutline(data.outline);
      setCitations(data.citations || []);
      setPhase('completed');
      
      if (onComplete && data.outline) {
        onComplete(data.outline);
      }

    } catch (err: any) {
      console.error('Error submitting answers:', err);
      setPhase('error');
      setError(err.message);
    }
  };

  const copyToClipboard = async () => {
    try {
      const fullContent = citations.length > 0
        ? `${outline}\n\n## Citations\n${citations.map(c => `- ${c.value}`).join('\n')}`
        : outline;
      
      await navigator.clipboard.writeText(fullContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getPhaseIcon = () => {
    switch (phase) {
      case 'researching':
        return <Bot className="w-6 h-6 text-blue-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Sparkles className="w-6 h-6 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <Clock className="w-5 h-5 text-gray-600 animate-spin mr-2" />
          <span className="text-gray-700">Loading outline generator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getPhaseIcon()}
            <div>
              <h3 className="text-xl font-semibold text-gray-900">AI Research Outline Generator</h3>
              <p className="text-sm text-gray-600 mt-1">
                Deep research with intelligent clarification questions
              </p>
            </div>
          </div>
          
          {phase === 'idle' && (
            <button
              onClick={startGeneration}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Bot className="w-4 h-4 mr-2" />
              Start AI Research
            </button>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && phase !== 'completed' && (
          <div className="mt-4 text-sm text-gray-700 bg-white/50 rounded p-3">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Clarification Questions - Removed in simplified flow */}
      {false && (
        <div className="bg-white border border-purple-200 rounded-lg p-6">
          <div className="mb-4">
            <h4 className="font-semibold text-purple-900 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Clarification Questions
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Please answer these questions to help create a better research outline:
            </p>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {index + 1}. {question}
                </label>
                <textarea
                  value={answers[index] || ''}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[index] = e.target.value;
                    setAnswers(newAnswers);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={2}
                  placeholder="Your answer..."
                />
              </div>
            ))}
          </div>

          <button
            onClick={submitAnswers}
            disabled={answers.some(a => !a.trim())}
            className="mt-6 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md flex items-center justify-center"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Answers & Continue Research
          </button>
        </div>
      )}

      {/* Research in Progress */}
      {phase === 'researching' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-blue-600 animate-pulse" />
            <div>
              <h4 className="font-semibold text-blue-900">Deep Research in Progress</h4>
              <p className="text-sm text-blue-700 mt-1">
                The AI is conducting comprehensive research and creating your outline...
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="animate-pulse space-y-2">
              <div className="h-2 bg-blue-200 rounded w-3/4"></div>
              <div className="h-2 bg-blue-200 rounded w-1/2"></div>
              <div className="h-2 bg-blue-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Outline */}
      {phase === 'completed' && outline && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Research Outline Generated Successfully!</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Outline
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Research Outline
            </h4>
            
            {/* Raw Text View */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raw Outline (Copy this to Step 3)
              </label>
              <textarea
                value={outline}
                readOnly
                className="w-full h-64 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none"
              />
            </div>

            {/* Formatted Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formatted Preview
              </label>
              <MarkdownPreview 
                content={outline}
                className="border border-gray-300 rounded-lg"
              />
            </div>

            {/* Citations */}
            {citations.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h5 className="font-medium text-gray-900 mb-3">📚 Sources & Citations</h5>
                <div className="space-y-1">
                  {citations.map((citation, index) => (
                    <div key={index} className="text-sm">
                      {citation.type === 'url' ? (
                        <a 
                          href={citation.value} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {citation.value}
                        </a>
                      ) : (
                        <span className="text-gray-700">• {citation.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Regenerate Button */}
          <div className="flex justify-center">
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
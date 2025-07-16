'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, CheckCircle, AlertCircle, XCircle, Clock, FileText, AlertTriangle, Copy } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';

interface AgenticFormattingCheckerProps {
  workflowId: string;
  onComplete?: (qaReport: any) => void;
}

interface QACheck {
  checkType: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  issuesFound?: string[];
  confidence?: number;
  fixSuggestions?: string;
  checkNumber: number;
}

export function AgenticFormattingChecker({ workflowId, onComplete }: AgenticFormattingCheckerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string>('idle');
  const [checks, setChecks] = useState<QACheck[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [overallStats, setOverallStats] = useState({ total: 0, passed: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [cleanedArticle, setCleanedArticle] = useState<string | null>(null);
  const [fixesApplied, setFixesApplied] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load existing QA session on component mount
  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/workflows/${workflowId}/formatting-qa/latest`);
        
        if (!response.ok) {
          throw new Error('Failed to load existing QA session');
        }
        
        const data = await response.json();
        
        if (data.success && data.session) {
          const session = data.session;
          console.log('Loading existing QA session:', session.id);
          
          // Set session state
          setSessionId(session.id);
          setStatus(session.status);
          
          // Load cleaned article and fixes if available
          if (session.cleanedArticle) {
            setCleanedArticle(session.cleanedArticle);
          }
          if (session.fixesApplied) {
            setFixesApplied(Array.isArray(session.fixesApplied) ? session.fixesApplied : []);
          }
          
          // Load checks from the session
          if (session.checks && session.checks.length > 0) {
            const formattedChecks = session.checks.map((check: any) => ({
              checkType: check.checkType,
              status: check.status,
              issuesFound: check.issuesFound ? check.issuesFound.split('\n').filter(Boolean) : [],
              confidence: check.confidenceScore,
              fixSuggestions: check.fixSuggestions,
              checkNumber: check.checkNumber
            }));
            setChecks(formattedChecks);
          }
          
          // Set overall stats
          if (session.totalChecks) {
            setOverallStats({
              total: session.totalChecks,
              passed: session.passedChecks || 0,
              failed: session.failedChecks || 0
            });
          }
          
          // If session is completed, trigger onComplete callback
          if (session.status === 'completed' && onComplete) {
            onComplete({
              sessionId: session.id,
              status: session.status,
              checks: session.checks,
              cleanedArticle: session.cleanedArticle,
              fixesApplied: session.fixesApplied
            });
          }
        }
      } catch (error) {
        console.error('Error loading existing QA session:', error);
        // Don't show error for missing sessions - this is expected for new workflows
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExistingSession();
  }, [workflowId, onComplete]);

  // Check type display names
  const checkTypeNames: Record<string, string> = {
    header_hierarchy: 'Header Hierarchy',
    line_breaks: 'Line Breaks',
    section_completeness: 'Section Completeness',
    list_consistency: 'List Consistency',
    bold_cleanup: 'Bold Cleanup',
    faq_formatting: 'FAQ Formatting',
    citation_placement: 'Citation Placement',
    utm_cleanup: 'UTM Cleanup'
  };

  const startQACheck = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setStatus('starting');
      setChecks([]);
      setOverallStats({ total: 8, passed: 0, failed: 0 });

      // Start QA session
      const response = await fetch(`/api/workflows/${workflowId}/formatting-qa/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start QA session');
      }

      const data = await response.json();
      const newSessionId = data.sessionId;
      setSessionId(newSessionId);

      // Connect to SSE stream
      const eventSource = new EventSource(
        `/api/workflows/${workflowId}/formatting-qa/stream?sessionId=${newSessionId}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleSSEUpdate(data);
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        setIsRunning(false);
        setStatus('error');
        setError('Connection lost');
      };

    } catch (err: any) {
      console.error('Error starting QA check:', err);
      setError(err.message);
      setIsRunning(false);
      setStatus('error');
    }
  };

  const handleSSEUpdate = (data: any) => {
    switch (data.type) {
      case 'status':
        setStatus(data.status);
        setCurrentMessage(data.message || '');
        break;

      case 'agent_thinking':
        setCurrentMessage(data.message);
        break;

      case 'check_completed':
        const newCheck: QACheck = {
          checkType: data.checkType,
          status: data.status,
          issuesFound: data.issuesFound,
          confidence: data.confidence,
          fixSuggestions: data.fixSuggestions,
          checkNumber: data.checkNumber
        };
        
        setChecks(prev => [...prev, newCheck]);
        
        // Update stats
        setOverallStats(prev => ({
          ...prev,
          passed: data.status === 'passed' ? prev.passed + 1 : prev.passed,
          failed: data.status === 'failed' ? prev.failed + 1 : prev.failed
        }));
        break;

      case 'cleaned_article_generated':
        setCleanedArticle(data.cleanedArticle);
        setFixesApplied(data.fixesApplied || []);
        setCurrentMessage('Cleaned article generated successfully!');
        break;

      case 'completed':
        setStatus('completed');
        setIsRunning(false);
        setOverallStats({
          total: data.totalChecks,
          passed: data.passedChecks,
          failed: data.failedChecks
        });
        setCurrentMessage(data.message);
        
        // Set cleaned article if provided
        if (data.cleanedArticle) {
          setCleanedArticle(data.cleanedArticle);
        }
        if (data.fixesApplied) {
          setFixesApplied(data.fixesApplied);
        }
        
        // Fetch full results
        if (sessionId) {
          fetchFullResults(sessionId);
        }
        break;

      case 'error':
        setStatus('error');
        setError(data.error || 'Unknown error occurred');
        setIsRunning(false);
        break;
    }
  };

  const fetchFullResults = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/formatting-qa/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (onComplete && data.session) {
          onComplete(data.session);
        }
      }
    } catch (err) {
      console.error('Error fetching full results:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const copyToClipboard = async (text: string, checkType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess({ ...copySuccess, [checkType]: true });
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [checkType]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-200';
    if (confidence >= 8) return 'bg-green-500';
    if (confidence >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Loading indicator */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-blue-700">Loading existing QA session...</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-purple-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">AI Formatting & QA Checker</h3>
              <p className="text-sm text-gray-600 mt-1">
                Automated formatting validation and quality assurance
              </p>
            </div>
          </div>
          
          {!isRunning && !isLoading && (
            <button
              onClick={startQACheck}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Bot className="w-4 h-4 mr-2" />
              {sessionId ? 'Run Again' : 'Start QA Check'}
            </button>
          )}
        </div>

        {/* Progress Stats */}
        {(isRunning || status === 'completed' || (sessionId && !isLoading)) && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{overallStats.total}</div>
              <div className="text-xs text-gray-600">Total Checks</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{overallStats.passed}</div>
              <div className="text-xs text-gray-600">Passed</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{overallStats.failed}</div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
          </div>
        )}
      </div>

      {/* Current Status */}
      {isRunning && currentMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-800">{currentMessage}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Checks List */}
      <div className="space-y-3">
          {checks.map((check, index) => (
            <div
              key={`${check.checkType}-${index}`}
              className={`bg-white rounded-lg border ${
                check.status === 'passed' ? 'border-green-200' : 
                check.status === 'failed' ? 'border-red-200' : 'border-yellow-200'
              } p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {checkTypeNames[check.checkType] || check.checkType}
                    </h4>
                    
                    {check.confidence && (
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-600">Confidence:</span>
                        <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getConfidenceColor(check.confidence)}`}
                            style={{ width: `${check.confidence * 10}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{check.confidence}/10</span>
                      </div>
                    )}

                    {check.issuesFound && check.issuesFound.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-red-700 mb-1">Issues Found:</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {check.issuesFound.map((issue, i) => (
                            <li key={i} className="text-sm text-gray-700">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {check.fixSuggestions && (
                      <div className="mt-3 relative">
                        <h5 className="text-sm font-medium text-blue-700 mb-1">Fix Suggestions:</h5>
                        <div className="bg-blue-50 rounded p-3 pr-10">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{check.fixSuggestions}</p>
                          <button
                            onClick={() => copyToClipboard(check.fixSuggestions || '', check.checkType)}
                            className="absolute top-2 right-2 p-1 hover:bg-blue-100 rounded"
                            title="Copy suggestions"
                          >
                            {copySuccess[check.checkType] ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Completion Summary */}
      {status === 'completed' && (
        <div
          className={`rounded-lg p-6 border-2 ${
            overallStats.failed === 0 
              ? 'bg-green-50 border-green-300' 
              : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <div className="flex items-center space-x-3 mb-4">
            {overallStats.failed === 0 ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">All Checks Passed!</h3>
                  <p className="text-sm text-green-700">
                    Your article meets all formatting and quality standards.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">Issues Fixed</h3>
                  <p className="text-sm text-yellow-700">
                    {overallStats.failed} issue{overallStats.failed !== 1 ? 's' : ''} found and fixed. 
                    Cleaned article generated below.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cleaned Article Output */}
      {cleanedArticle && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cleaned Article</h3>
                <p className="text-sm text-gray-600">
                  AI-fixed version with all formatting issues resolved
                </p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(cleanedArticle, 'cleaned_article')}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {copySuccess.cleaned_article ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Article
                </>
              )}
            </button>
          </div>

          {/* Fixes Applied */}
          {fixesApplied.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Fixes Applied:</h4>
              <div className="flex flex-wrap gap-2">
                {fixesApplied.map((fix, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {fix}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Article Preview with Dual View */}
          <div className="space-y-4">
            {/* Raw Markdown View */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Cleaned Article (Markdown)
              </label>
              <textarea
                value={cleanedArticle}
                readOnly
                className="w-full h-64 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none"
                placeholder="The cleaned article will appear here..."
              />
            </div>
            
            {/* Rendered Preview */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Formatted Preview
              </label>
              <MarkdownPreview 
                content={cleanedArticle}
                className="border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
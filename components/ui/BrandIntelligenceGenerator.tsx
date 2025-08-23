'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, CheckCircle, AlertCircle, Clock, Loader2, Copy, XCircle, Sparkles, MessageSquare, FileText, Edit3 } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';

interface BrandIntelligenceGeneratorProps {
  clientId: string;
  onComplete?: (brief: string) => void;
  userType?: string; // 'internal' or 'account' 
}

// Multi-phase status types
type ResearchStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';
type BriefStatus = 'idle' | 'queued' | 'in_progress' | 'completed' | 'error';
type CurrentPhase = 'research' | 'input' | 'brief' | 'completed';

interface ResearchOutput {
  analysis: string;
  gaps: Array<{
    category: string;
    question: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  sources: Array<{
    type: 'url' | 'document' | 'analysis';
    value: string;
    description?: string;
  }>;
}

export function BrandIntelligenceGenerator({ clientId, onComplete, userType = 'internal' }: BrandIntelligenceGeneratorProps) {
  // Status tracking
  const [currentPhase, setCurrentPhase] = useState<CurrentPhase>('research');
  const [researchStatus, setResearchStatus] = useState<ResearchStatus>('idle');
  const [briefStatus, setBriefStatus] = useState<BriefStatus>('idle');
  
  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [researchSessionId, setResearchSessionId] = useState<string | null>(null);
  const [briefSessionId, setBriefSessionId] = useState<string | null>(null);
  
  // Data states
  const [researchOutput, setResearchOutput] = useState<ResearchOutput | null>(null);
  const [clientInput, setClientInput] = useState<string>('');
  const [finalBrief, setFinalBrief] = useState<string>('');
  
  // UI states
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [editedBrief, setEditedBrief] = useState<string>('');
  
  // Input state
  const [inputText, setInputText] = useState<string>('');
  const [isSubmittingInput, setIsSubmittingInput] = useState(false);
  const [isEditingResearch, setIsEditingResearch] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState('');
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing session on mount
  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/clients/${clientId}/brand-intelligence/latest`);
        
        if (!response.ok) {
          throw new Error('Failed to load existing session');
        }
        
        const data = await response.json();
        
        if (data.success && data.session) {
          const session = data.session;
          console.log('Loading existing brand intelligence session:', session.id);
          
          setSessionId(session.id);
          setResearchSessionId(session.researchSessionId);
          setBriefSessionId(session.briefSessionId);
          setResearchStatus(session.researchStatus);
          setBriefStatus(session.briefStatus);
          
          // Load existing data
          if (session.researchOutput) {
            setResearchOutput(session.researchOutput);
          }
          if (session.clientInput) {
            setClientInput(session.clientInput);
          }
          if (session.finalBrief) {
            setFinalBrief(session.finalBrief);
          }
          
          // Determine current phase and start polling if needed
          if (['queued', 'in_progress'].includes(session.researchStatus)) {
            setCurrentPhase('research');
            startPolling(session.researchSessionId || session.id);
          } else if (session.researchStatus === 'completed' && !session.clientInput) {
            setCurrentPhase('input');
          } else if (['queued', 'in_progress'].includes(session.briefStatus)) {
            setCurrentPhase('brief');
            startPolling(session.briefSessionId || session.id);
          } else if (session.briefStatus === 'completed' && session.finalBrief) {
            setCurrentPhase('completed');
            if (onComplete) {
              onComplete(session.finalBrief);
            }
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
  }, [clientId]);

  const startResearch = async () => {
    try {
      setResearchStatus('queued');
      setError('');
      setProgress('Starting deep research analysis of your business...');
      setCurrentPhase('research');

      const response = await fetch(`/api/clients/${clientId}/brand-intelligence/start-research`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start brand intelligence research');
      }

      const data = await response.json();
      
      // Handle different response statuses
      if (data.status === 'already_active') {
        setSessionId(data.existingSessionId);
        setResearchSessionId(data.sessionId);
        setResearchStatus('in_progress');
        setProgress('Resuming existing research that is already in progress...');
        startPolling(data.sessionId);
      } else {
        setSessionId(data.existingSessionId);
        setResearchSessionId(data.sessionId);
        startPolling(data.sessionId);
      }

    } catch (err: any) {
      console.error('Error starting research:', err);
      setResearchStatus('error');
      setError(err.message);
    }
  };

  const startPolling = (pollSessionId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/clients/${clientId}/brand-intelligence/status?sessionId=${pollSessionId}`
        );

        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const data = await response.json();
        setPollingCount(prev => prev + 1);

        // Update statuses
        setResearchStatus(data.researchStatus);
        setBriefStatus(data.briefStatus);
        
        if (data.progress) {
          setProgress(data.progress);
        }

        // Handle research completion
        if (data.researchStatus === 'completed' && data.researchOutput) {
          setResearchOutput(data.researchOutput);
          setCurrentPhase('input');
          setProgress('Research completed! Please provide additional context below.');
          
          // Stop polling for research
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
        }

        // Handle brief completion
        if (data.briefStatus === 'completed' && data.finalBrief) {
          setFinalBrief(data.finalBrief);
          setCurrentPhase('completed');
          setProgress('Brand intelligence completed successfully!');
          
          if (onComplete) {
            onComplete(data.finalBrief);
          }
          
          // Stop polling
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
        }

        // Handle errors
        if (data.error || data.researchStatus === 'error' || data.briefStatus === 'error') {
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

  const submitClientInput = async () => {
    if (!inputText.trim()) return;
    
    try {
      setIsSubmittingInput(true);
      setError('');

      const response = await fetch(`/api/clients/${clientId}/brand-intelligence/submit-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientInput: inputText.trim(),
          sessionId 
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit input');
      }

      setClientInput(inputText.trim());
      setInputText('');
      setProgress('Input submitted successfully. Ready to generate comprehensive brief.');

    } catch (err: any) {
      console.error('Error submitting input:', err);
      setError(err.message);
    } finally {
      setIsSubmittingInput(false);
    }
  };

  const generateBrief = async () => {
    try {
      setCurrentPhase('brief');
      setBriefStatus('queued');
      setError('');
      setProgress('Generating comprehensive brand brief...');

      const response = await fetch(`/api/clients/${clientId}/brand-intelligence/generate-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start brief generation');
      }

      const data = await response.json();
      setBriefSessionId(data.briefSessionId);
      
      // Start polling for brief status
      startPolling(data.briefSessionId);

    } catch (err: any) {
      console.error('Error generating brief:', err);
      setBriefStatus('error');
      setError(err.message);
    }
  };

  const saveBriefEdit = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/brand-intelligence/brief`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          finalBrief: editedBrief,
          sessionId 
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save brief');
      }

      setFinalBrief(editedBrief);
      setIsEditingBrief(false);
      setProgress('Brief updated successfully!');

    } catch (err: any) {
      console.error('Error saving brief:', err);
      setError(err.message);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(finalBrief);
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
          <h3 className="text-lg font-semibold text-gray-900">Brand Intelligence System</h3>
        </div>
        <p className="text-sm text-gray-600">
          <strong className="text-gray-700">Critical for SEO Strategy:</strong> Gathers accurate brand information for article creation, 
          then publishes this data so search engines and AI models learn what your business actually does. 
          This intelligence becomes the foundation that language models use to recommend your services to others.
        </p>
      </div>

      {/* Phase 1: Research */}
      {currentPhase === 'research' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Phase 1: Deep Business Research</h4>
          
          {researchStatus === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                AI will analyze your business website, search for third-party mentions, and create a comprehensive 
                overview. This process takes 15-20 minutes.
              </p>
              {userType === 'internal' ? (
                <button
                  onClick={startResearch}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Bot className="w-5 h-5" />
                  <span>Start Deep Research</span>
                </button>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Brand intelligence research needs to be initiated by your account manager. 
                    Once started, you'll be able to participate by providing additional context.
                  </p>
                </div>
              )}
            </div>
          )}

          {['queued', 'in_progress'].includes(researchStatus) && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="font-medium">Research in Progress</span>
              </div>
              <p className="text-sm text-gray-600">{progress}</p>
              <div className="text-xs text-gray-500">
                Status checks: #{pollingCount} • Elapsed: {formatTime(pollingCount * 5)}
              </div>
            </div>
          )}

          {researchStatus === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-700">Research Failed</span>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              {userType === 'internal' && (
                <button
                  onClick={startResearch}
                  className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Retry Research
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase 2: Client Input */}
      {currentPhase === 'input' && researchOutput && (
        <div className="space-y-6">
          {/* Research Results */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h4 className="font-medium text-gray-900">Research Completed</h4>
              </div>
              <button
                onClick={() => {
                  if (!isEditingResearch) {
                    setEditedAnalysis(researchOutput.analysis);
                  }
                  setIsEditingResearch(!isEditingResearch);
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isEditingResearch ? 'Cancel Edit' : 'Edit Research'}
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Business Analysis</h5>
                {isEditingResearch ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedAnalysis}
                      onChange={(e) => setEditedAnalysis(e.target.value)}
                      className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                      placeholder="Edit the research analysis here..."
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setIsEditingResearch(false);
                          setEditedAnalysis('');
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setResearchOutput(prev => ({
                            ...prev!,
                            analysis: editedAnalysis
                          }));
                          setIsEditingResearch(false);
                        }}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <MarkdownPreview content={researchOutput.analysis} />
                  </div>
                )}
              </div>

              {researchOutput.gaps.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Information Gaps Identified</h5>
                  <div className="space-y-2">
                    {researchOutput.gaps.map((gap, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
                            {gap.importance.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{gap.category}</span>
                        </div>
                        <p className="text-sm text-gray-700">{gap.question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client Input Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h4 className="font-medium text-gray-900">Your Input Needed</h4>
            </div>
            
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> This is a one-time input. Please provide all relevant information 
                  about the gaps identified above, plus any additional context about your business.
                </p>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Please provide information about the gaps identified above, plus any additional context about your business, products, services, target audience, unique value propositions, achievements, or other relevant details..."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg resize-none"
                maxLength={100000}
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {inputText.length}/100,000 characters
                </span>
                <button
                  onClick={submitClientInput}
                  disabled={!inputText.trim() || isSubmittingInput}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                >
                  {isSubmittingInput && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit Input</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ready for Brief Generation */}
          {clientInput && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Ready for Brief Generation</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Your input has been submitted. Generate the comprehensive brand brief.
                  </p>
                </div>
                <button
                  onClick={generateBrief}
                  className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Brief</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase 3: Brief Generation */}
      {currentPhase === 'brief' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Phase 3: Brand Brief Generation</h4>
          
          {['queued', 'in_progress'].includes(briefStatus) && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="font-medium">Generating Brand Brief</span>
              </div>
              <p className="text-sm text-gray-600">{progress}</p>
              <div className="text-xs text-gray-500">
                Status checks: #{pollingCount} • Elapsed: {formatTime(pollingCount * 5)}
              </div>
            </div>
          )}

          {briefStatus === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-700">Brief Generation Failed</span>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={generateBrief}
                className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Retry Brief Generation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 4: Completed */}
      {currentPhase === 'completed' && finalBrief && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h4 className="font-medium text-gray-900">Brand Intelligence Complete</h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditedBrief(finalBrief);
                    setIsEditingBrief(true);
                  }}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {isEditingBrief ? (
                <div className="space-y-4">
                  <textarea
                    value={editedBrief}
                    onChange={(e) => setEditedBrief(e.target.value)}
                    className="w-full h-96 p-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                    maxLength={50000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {editedBrief.length}/50,000 characters
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setIsEditingBrief(false);
                          setEditedBrief('');
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveBriefEdit}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <MarkdownPreview content={finalBrief} />
                </div>
              )}
            </div>
          </div>

          {/* Regenerate Button - Internal Only */}
          {userType === 'internal' && (
            <div className="flex justify-center">
              <button
                onClick={startResearch}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate New Brand Intelligence
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && currentPhase !== 'research' && currentPhase !== 'brief' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {progress && !['research', 'brief'].includes(currentPhase) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">{progress}</p>
        </div>
      )}
    </div>
  );
}
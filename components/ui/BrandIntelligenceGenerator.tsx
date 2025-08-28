'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, CheckCircle, AlertCircle, Clock, Loader2, Copy, XCircle, Sparkles, MessageSquare, FileText, Edit3, Mail, Send } from 'lucide-react';
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
  
  // Email state
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [answerUrl, setAnswerUrl] = useState<string | null>(null);
  
  // External user question answers
  const [questionAnswers, setQuestionAnswers] = useState<{ [key: number]: string }>({});
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  
  // Full session data with metadata
  const [sessionData, setSessionData] = useState<any>(null);
  
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
          console.log('Loading existing brand intelligence session:', session.id, {
            researchStatus: session.researchStatus,
            briefStatus: session.briefStatus,
            hasClientInput: !!session.clientInput,
            hasClientAnswers: !!(session.metadata?.clientAnswers),
            hasFinalBrief: !!session.finalBrief
          });
          
          setSessionData(session); // Store full session data
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
          
          // Load existing question answers for external users
          if (session.metadata?.clientAnswers && userType === 'account') {
            setQuestionAnswers(session.metadata.clientAnswers);
          }
          
          // Determine current phase and start polling if needed
          if (['queued', 'in_progress'].includes(session.researchStatus)) {
            setCurrentPhase('research');
            startPolling(session.researchSessionId || session.id);
          } else if (session.researchStatus === 'completed' && !session.clientInput) {
            setCurrentPhase('input');
          } else if (session.researchStatus === 'completed' && session.clientInput && ['idle', 'error'].includes(session.briefStatus)) {
            // Research completed + client input exists + brief not started/failed = ready for brief generation
            setCurrentPhase('input');
          } else if (['queued', 'in_progress'].includes(session.briefStatus)) {
            setCurrentPhase('brief');
            startPolling(session.briefSessionId || session.id);
          } else if (session.briefStatus === 'completed' && session.finalBrief) {
            setCurrentPhase('completed');
            if (onComplete) {
              onComplete(session.finalBrief);
            }
          } else {
            // Fallback: if no conditions match, determine based on available data
            console.warn('Phase detection fallback triggered', { 
              researchStatus: session.researchStatus, 
              briefStatus: session.briefStatus, 
              hasClientInput: !!session.clientInput, 
              hasFinalBrief: !!session.finalBrief 
            });
            
            if (session.researchStatus === 'completed' && session.clientInput) {
              setCurrentPhase('input'); // Default to input phase if research is done and input exists
            } else if (session.researchStatus === 'completed') {
              setCurrentPhase('input'); // Default to input phase if research is done
            } else {
              setCurrentPhase('research'); // Default to research phase
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
        
        // Debug logging for polling
        console.log('Polling update:', {
          briefStatus: data.briefStatus,
          hasFinalBrief: !!data.finalBrief,
          briefLength: data.finalBrief?.length || 0,
          currentPhase,
          pollCount: pollingCount
        });

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
        if (data.briefStatus === 'completed') {
          // Brief is marked as completed
          if (data.finalBrief) {
            setFinalBrief(data.finalBrief);
          }
          setCurrentPhase('completed');
          setProgress('Brand intelligence completed successfully!');
          
          if (onComplete && data.finalBrief) {
            onComplete(data.finalBrief);
          }
          
          // Stop polling
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          
          // If we don't have the brief content yet, try to reload it
          if (!data.finalBrief) {
            console.log('Brief marked complete but content not in response, reloading...');
            setTimeout(async () => {
              try {
                const reloadResponse = await fetch(`/api/clients/${clientId}/brand-intelligence/latest`);
                if (reloadResponse.ok) {
                  const reloadData = await reloadResponse.json();
                  if (reloadData.session?.finalBrief) {
                    setFinalBrief(reloadData.session.finalBrief);
                    if (onComplete) {
                      onComplete(reloadData.session.finalBrief);
                    }
                  }
                }
              } catch (error) {
                console.error('Error reloading brief:', error);
              }
            }, 1000);
          }
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

  const sendQuestionsToClient = async () => {
    try {
      setIsSendingEmail(true);
      setError('');

      const response = await fetch(`/api/clients/${clientId}/brand-intelligence/send-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send questions to client');
      }

      const result = await response.json();
      if (result.answerUrl) {
        setAnswerUrl(result.answerUrl);
      }

      setEmailSent(true);
      setTimeout(() => {
        setEmailSent(false);
        setAnswerUrl(null);
      }, 30000); // Show URL for 30 seconds

    } catch (err: any) {
      console.error('Error sending questions:', err);
      setError(err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleQuestionAnswerChange = (index: number, value: string) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const submitQuestionAnswers = async () => {
    try {
      setIsSubmittingAnswers(true);
      setError('');

      // Validate that all questions are answered
      const unansweredQuestions = researchOutput!.gaps.filter((_: any, index: number) => !questionAnswers[index]?.trim());
      if (unansweredQuestions.length > 0) {
        throw new Error('Please answer all questions before submitting');
      }

      const response = await fetch(`/api/clients/${clientId}/brand-intelligence/submit-direct-answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          answers: questionAnswers,
          sessionId 
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit answers');
      }

      // Update client input state to move to next phase
      const answersText = Object.values(questionAnswers).join('\n\n');
      setClientInput(answersText);
      setProgress('Answers submitted successfully! Ready to generate brand brief.');

    } catch (err: any) {
      console.error('Error submitting answers:', err);
      setError(err.message);
    } finally {
      setIsSubmittingAnswers(false);
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
      {/* Phase Progress Indicator - Now Clickable Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              {/* Deep Research Tab */}
              <button 
                onClick={() => {
                  if (researchStatus === 'completed' || currentPhase === 'research') {
                    setCurrentPhase('research');
                  }
                }}
                disabled={researchStatus === 'idle' && currentPhase !== 'research'}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  currentPhase === 'research' ? 'bg-purple-100 text-purple-700' :
                  researchStatus === 'completed' ? 'text-purple-600 hover:bg-purple-50 cursor-pointer' : 
                  'text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  researchStatus === 'completed' ? 'bg-green-100 text-green-600' : 
                  currentPhase === 'research' ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  {researchStatus === 'completed' ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <span className="text-sm font-medium">Deep Research</span>
              </button>
              
              {/* Questionnaire Tab */}
              <button 
                onClick={() => {
                  if (researchStatus === 'completed' || currentPhase === 'input' || clientInput) {
                    setCurrentPhase('input');
                  }
                }}
                disabled={researchStatus !== 'completed' && currentPhase !== 'input'}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  currentPhase === 'input' ? 'bg-purple-100 text-purple-700' :
                  (researchStatus === 'completed' || clientInput) ? 'text-purple-600 hover:bg-purple-50 cursor-pointer' :
                  'text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  clientInput ? 'bg-green-100 text-green-600' : 
                  currentPhase === 'input' ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  {clientInput ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <span className="text-sm font-medium">Questionnaire</span>
              </button>
              
              {/* Brief Creation Tab */}
              <button 
                onClick={() => {
                  if (currentPhase === 'completed' || briefStatus === 'completed' || currentPhase === 'brief') {
                    setCurrentPhase('completed');
                  }
                }}
                disabled={!clientInput && currentPhase !== 'brief' && currentPhase !== 'completed'}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  currentPhase === 'completed' || currentPhase === 'brief' ? 'bg-purple-100 text-purple-700' :
                  (briefStatus === 'completed' || clientInput) ? 'text-purple-600 hover:bg-purple-50 cursor-pointer' :
                  'text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentPhase === 'completed' ? 'bg-green-100 text-green-600' : 
                  currentPhase === 'brief' ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  {currentPhase === 'completed' ? <CheckCircle className="w-5 h-5" /> : '3'}
                </div>
                <span className="text-sm font-medium">Brief Creation</span>
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: currentPhase === 'research' ? '33%' : 
                         currentPhase === 'input' ? '66%' : 
                         currentPhase === 'brief' ? '85%' : 
                         currentPhase === 'completed' ? '100%' : '0%' 
                }}
              />
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          <strong className="text-gray-700">Why this matters:</strong> This comprehensive brand brief helps us understand your business deeply 
          and ensures all content accurately represents your company. It becomes the foundation for consistent messaging across all publications.
        </p>
      </div>

      {/* Phase 1: Deep Research */}
      {currentPhase === 'research' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-semibold">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Phase 1: Deep Research</h4>
              <p className="text-xs text-gray-500">15-20 minutes</p>
            </div>
          </div>
          
          {researchStatus === 'idle' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium mb-1">What happens in this phase:</p>
                    <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                      <li>Deep analysis of your website to understand your services</li>
                      <li>Research third-party mentions and reviews</li>
                      <li>Analyze competitor positioning</li>
                      <li>Identify information gaps that need clarification</li>
                    </ul>
                  </div>
                </div>
              </div>
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

      {/* Phase 1: Research Results View (when navigated back to completed research) */}
      {currentPhase === 'research' && researchStatus === 'completed' && researchOutput && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <h4 className="font-medium text-gray-900">Deep Research Complete</h4>
              <p className="text-xs text-gray-500">Brand research findings</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Brand Analysis</h5>
              <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg">
                <MarkdownPreview content={researchOutput.analysis} />
              </div>
            </div>

            {researchOutput.gaps && researchOutput.gaps.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Information Gaps Identified</h5>
                <div className="space-y-2">
                  {researchOutput.gaps.map((gap, idx) => (
                    <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
                          {gap.importance ? gap.importance.toUpperCase() : 'MEDIUM'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{gap.category || 'General'}</span>
                      </div>
                      <p className="text-sm text-gray-700">{gap.question || 'Question not available'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {researchOutput.sources && researchOutput.sources.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Sources</h5>
                <div className="space-y-1">
                  {researchOutput.sources.map((source, idx) => (
                    <div key={idx} className="text-sm text-gray-600 flex items-center space-x-2">
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">{source.type}</span>
                      <span>{source.value}</span>
                      {source.description && <span className="text-gray-500">- {source.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Phase 2: Questionnaire Placeholder */}
      {currentPhase !== 'input' && !researchOutput && currentPhase !== 'brief' && currentPhase !== 'completed' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-400 font-semibold">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-500">Phase 2: Questionnaire</h4>
              <p className="text-xs text-gray-400">5-10 minutes</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            After research completes, you'll answer specific questions about your business to fill any information gaps.
          </p>
        </div>
      )}
      
      {/* Phase 3: Brief Creation Placeholder */}
      {currentPhase !== 'brief' && currentPhase !== 'completed' && !finalBrief && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-400 font-semibold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-500">Phase 3: Brief Creation</h4>
              <p className="text-xs text-gray-400">10-15 minutes</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            We'll combine research findings with your input to create a comprehensive brand brief that guides all content creation.
          </p>
        </div>
      )}

      {/* Phase 2: Questionnaire (Active) */}
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">Information Gaps Identified</h5>
                  {researchOutput.gaps && researchOutput.gaps.length > 0 && userType === 'internal' && (
                    <button
                      onClick={sendQuestionsToClient}
                      disabled={isSendingEmail || emailSent}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      {isSendingEmail ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : emailSent ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <Mail className="w-3 h-3 mr-1" />
                      )}
                      {isSendingEmail ? 'Sending...' : emailSent ? 'Email Sent!' : 'Send to Client'}
                    </button>
                  )}
                  
                  {/* Answer URL Display */}
                  {answerUrl && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Questions Sent!</span>
                      </div>
                      <p className="text-xs text-green-700 mb-2">
                        Share this URL with the client so they can answer the questions:
                      </p>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={answerUrl}
                          readOnly
                          className="flex-1 text-xs font-mono bg-white border border-green-300 rounded px-2 py-1 text-green-800"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(answerUrl)}
                          className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {researchOutput.gaps && researchOutput.gaps.length > 0 ? (
                  <div className="space-y-2">
                    {researchOutput.gaps.map((gap, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
                            {gap.importance ? gap.importance.toUpperCase() : 'MEDIUM'}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{gap.category || 'General'}</span>
                        </div>
                        <p className="text-sm text-gray-700">{gap.question || 'Question not available'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-green-800 font-medium mb-1">Research Complete</p>
                        <p className="text-sm text-green-700">
                          The research found comprehensive information about your business. No additional clarification is needed to proceed with the questionnaire.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client Input Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Phase 2: Questionnaire</h4>
                <p className="text-xs text-gray-500">Fill information gaps</p>
              </div>
            </div>
            
            {userType === 'internal' ? (
              // Internal user sees rich structured data from external submissions
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Internal Note:</strong> {sessionData?.metadata?.clientAnswers ? 'Client has submitted answers via external form.' : 'Client input will be collected here. You can send questions to the client via email using the button above.'}
                  </p>
                </div>

                {/* Show structured client answers if available */}
                {sessionData?.metadata?.clientAnswers && Object.keys(sessionData.metadata.clientAnswers).length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ Client Answers Received
                      </p>
                      <p className="text-xs text-green-700">
                        Answers submitted on {sessionData.metadata.answersSubmittedAt ? new Date(sessionData.metadata.answersSubmittedAt).toLocaleString() : 'recently'}
                      </p>
                    </div>

                    {/* Display individual question answers */}
                    <div className="space-y-4">
                      {researchOutput?.gaps?.map((gap: any, index: number) => {
                        const answer = sessionData.metadata.clientAnswers[index.toString()] || sessionData.metadata.clientAnswers[index];
                        return (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                gap.importance === 'high' ? 'bg-red-100 text-red-800' :
                                gap.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {gap.importance ? gap.importance.toUpperCase() : 'MEDIUM'}
                              </span>
                              <span className="text-sm font-medium text-gray-600">{gap.category || 'General'}</span>
                            </div>
                            
                            <h4 className="font-medium text-gray-900 mb-3">
                              {gap.question || 'Question not available'}
                            </h4>
                            
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-sm text-gray-800">
                                {answer || <span className="italic text-gray-500">No answer provided</span>}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Show edited research if available */}
                    {sessionData.metadata.editedResearch && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">Client-Edited Research Analysis</h5>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {sessionData.metadata.editedResearch}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show additional business info if available */}
                    {sessionData.metadata.additionalInfo && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">Additional Business Information</h5>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {sessionData.metadata.additionalInfo}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Fallback to manual input if no structured data
                  <div className="space-y-4">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Client input will appear here, or you can manually enter information about the gaps identified above..."
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
                )}
              </div>
            ) : (
              // External user sees individual questions
              <div className="space-y-6">
                {clientInput ? (
                  // Show submitted answers with edit option
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-800 font-medium">
                          ✅ Your answers have been submitted successfully!
                        </p>
                        <p className="text-xs text-green-700">
                          You can review and edit your answers below if needed.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          // Initialize question answers from existing client input if not already done
                          if (Object.keys(questionAnswers).length === 0 && researchOutput?.gaps) {
                            const existingAnswers: { [key: number]: string } = {};
                            const answerTexts = clientInput.split('\n\n');
                            researchOutput.gaps.forEach((_: any, index: number) => {
                              existingAnswers[index] = answerTexts[index] || '';
                            });
                            setQuestionAnswers(existingAnswers);
                          }
                        }}
                        className="text-xs text-green-700 hover:text-green-900 font-medium"
                      >
                        Edit Answers
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Your Input Needed:</strong> Please answer each question below to help us create an accurate brand brief for your business.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {researchOutput?.gaps?.map((gap: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          gap.importance === 'high' ? 'bg-red-100 text-red-800' :
                          gap.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {gap.importance ? gap.importance.toUpperCase() : 'MEDIUM'}
                        </span>
                        <span className="text-sm font-medium text-gray-600">{gap.category || 'General'}</span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-3">
                        {gap.question || 'Question not available'}
                      </h4>
                      
                      <textarea
                        value={questionAnswers[index] || ''}
                        onChange={(e) => handleQuestionAnswerChange(index, e.target.value)}
                        placeholder="Please provide your answer here..."
                        className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        maxLength={2000}
                      />
                      
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {(questionAnswers[index] || '').length}/2,000 characters
                        </span>
                        {questionAnswers[index]?.trim() && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={submitQuestionAnswers}
                    disabled={isSubmittingAnswers || researchOutput?.gaps?.some((_: any, index: number) => !questionAnswers[index]?.trim())}
                    className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                  >
                    {isSubmittingAnswers ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span>
                      {isSubmittingAnswers ? 'Submitting...' : clientInput ? 'Update All Answers' : 'Submit All Answers'}
                    </span>
                  </button>
                </div>

                <div className="text-center text-xs text-gray-500">
                  All questions must be answered to proceed to the next phase
                </div>
              </div>
            )}
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
      
      {/* Phase 3 Placeholder when in Phase 2 */}
      {currentPhase === 'input' && !briefStatus && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-400 font-semibold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-500">Phase 3: Brief Creation</h4>
              <p className="text-xs text-gray-400">10-15 minutes</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            After you submit your input, we'll create a comprehensive brand brief combining all research and your answers.
          </p>
        </div>
      )}

      {/* Phase 3: AI Brief Creation */}
      {currentPhase === 'brief' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-semibold">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Phase 3: Brief Creation</h4>
              <p className="text-xs text-gray-500">Generating comprehensive brief</p>
            </div>
          </div>
          
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

      {/* Completed Brief */}
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
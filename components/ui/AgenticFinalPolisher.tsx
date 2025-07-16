'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertTriangle, BarChart3, Brain, Target, FileText, TrendingUp } from 'lucide-react';

interface AgenticFinalPolisherProps {
  workflowId: string;
  onComplete?: (polishedArticle: string) => void;
}

interface PolishProgress {
  type: string;
  status?: string;
  message?: string;
  sections?: any[];
  totalSections?: number;
  section_title?: string;
  strengths?: string;
  weaknesses?: string;
  brand_conflicts?: string;
  polished_content?: string;
  polish_approach?: string;
  engagement_score?: number;
  clarity_score?: number;
  ordinal?: number;
  total_conflicts_resolved?: number;
  finalPolishedArticle?: string;
  avgEngagementScore?: number;
  avgClarityScore?: number;
  polishApproaches?: string[];
  error?: string;
}

interface PolishSection {
  title: string;
  strengths: string;
  weaknesses: string;
  brandConflicts: string;
  polishApproach: string;
  engagementScore: number;
  clarityScore: number;
  content: string;
}

export const AgenticFinalPolisher: React.FC<AgenticFinalPolisherProps> = ({
  workflowId,
  onComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<PolishProgress | null>(null);
  const [sections, setSections] = useState<PolishSection[]>([]);
  const [finalArticle, setFinalArticle] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [totalSections, setTotalSections] = useState(0);
  const [completedSections, setCompletedSections] = useState(0);

  // Start the agentic final polish process
  const startPolish = async () => {
    try {
      setIsRunning(true);
      setError('');
      setProgress(null);
      setSections([]);
      setFinalArticle('');
      setCompletedSections(0);

      console.log('🎨 Starting agentic final polish...');

      // Start the polish session
      const response = await fetch(`/api/workflows/${workflowId}/final-polish/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start final polish');
      }

      setSessionId(data.sessionId);
      console.log('✅ Polish session started:', data.sessionId);

      // Start listening to SSE stream
      startSSEStream(data.sessionId);

    } catch (error: any) {
      console.error('❌ Error starting final polish:', error);
      setError(error.message || 'Failed to start final polish');
      setIsRunning(false);
    }
  };

  // Start SSE stream for real-time updates
  const startSSEStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/final-polish/stream?sessionId=${sessionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data: PolishProgress = JSON.parse(event.data);
        console.log('📡 Polish SSE update:', data);
        
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
        console.log('🔗 Connected to polish stream');
        break;

      case 'status':
        console.log(`📊 Status: ${data.status} - ${data.message}`);
        break;

      case 'parsed':
        console.log(`📄 Article parsed into ${data.totalSections} sections`);
        setTotalSections(data.totalSections || 0);
        break;

      case 'section_completed':
        console.log(`✅ Section completed: ${data.section_title}`);
        setCompletedSections(data.ordinal || 0);
        
        if (data.section_title && data.strengths && data.weaknesses) {
          const newSection: PolishSection = {
            title: data.section_title,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            brandConflicts: data.brand_conflicts || '',
            polishApproach: data.polish_approach || '',
            engagementScore: data.engagement_score || 0,
            clarityScore: data.clarity_score || 0,
            content: data.polished_content || ''
          };
          
          setSections(prev => [...prev, newSection]);
        }
        break;

      case 'completed':
        console.log('🎉 Final polish completed!');
        setFinalArticle(data.finalPolishedArticle || '');
        setIsRunning(false);
        
        if (onComplete && data.finalPolishedArticle) {
          onComplete(data.finalPolishedArticle);
        }
        break;

      case 'error':
        console.error('❌ Polish error:', data.error);
        setError(data.error || 'An error occurred during final polish');
        setIsRunning(false);
        break;
    }
  };

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Get progress percentage
  const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-600 rounded-full p-2">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Agentic Final Polish</h3>
            <p className="text-sm text-purple-700">
              AI-powered final polish balancing brand engagement with semantic clarity
            </p>
          </div>
        </div>
        
        {!isRunning && !finalArticle && (
          <button
            onClick={startPolish}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Brain className="w-4 h-4" />
            <span>Start Final Polish</span>
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
                {progress?.message || 'Processing...'}
              </span>
            </div>
            {totalSections > 0 && (
              <span className="text-xs text-purple-600">
                {completedSections} / {totalSections} sections
              </span>
            )}
          </div>
          
          {totalSections > 0 && (
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Sections Results */}
      {sections.length > 0 && (
        <div className="mb-4 space-y-3">
          <h4 className="font-medium text-purple-900 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Section Analysis ({sections.length})</span>
          </h4>
          
          <div className="max-h-60 overflow-y-auto space-y-3">
            {sections.map((section, index) => (
              <div key={index} className="bg-white border border-purple-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900 text-sm">{section.title}</h5>
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(section.engagementScore)}`}>
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      {section.engagementScore}/10
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(section.clarityScore)}`}>
                      <Target className="w-3 h-3 inline mr-1" />
                      {section.clarityScore}/10
                    </div>
                  </div>
                </div>
                
                {section.brandConflicts && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <p className="font-medium text-amber-800">Brand vs Semantic Conflict:</p>
                    <p className="text-amber-700">{section.brandConflicts}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-medium text-green-700">Strengths:</p>
                    <p className="text-green-600">{section.strengths}</p>
                  </div>
                  <div>
                    <p className="font-medium text-orange-700">Improvements:</p>
                    <p className="text-orange-600">{section.weaknesses}</p>
                  </div>
                </div>
                
                {section.polishApproach && (
                  <div className="mt-2 text-xs">
                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {section.polishApproach}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Results */}
      {finalArticle && !isRunning && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-purple-900 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Final Polish Complete</span>
            </h4>
            {progress?.avgEngagementScore && progress?.avgClarityScore && (
              <div className="flex items-center space-x-3">
                <div className="text-xs text-gray-600">
                  Avg Engagement: <span className="font-medium">{progress.avgEngagementScore}/10</span>
                </div>
                <div className="text-xs text-gray-600">
                  Avg Clarity: <span className="font-medium">{progress.avgClarityScore}/10</span>
                </div>
              </div>
            )}
          </div>
          
          {progress?.total_conflicts_resolved && progress.total_conflicts_resolved > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Successfully resolved {progress.total_conflicts_resolved} brand vs semantic conflicts</strong>
                {progress.polishApproaches && progress.polishApproaches.length > 0 && (
                  <span className="block mt-1 text-xs">
                    Approaches used: {progress.polishApproaches.join(', ')}
                  </span>
                )}
              </p>
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
            <Brain className="w-8 h-8 mx-auto mb-2" />
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Ready to perform final polish on your SEO-optimized article
          </p>
          <p className="text-xs text-gray-500">
            AI will balance brand engagement with semantic directness
          </p>
        </div>
      )}
    </div>
  );
};
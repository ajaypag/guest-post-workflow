'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, AlertCircle, Clock, Search, Zap, Target } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';

interface AgenticSemanticAuditorProps {
  workflowId: string;
  originalArticle: string;
  researchOutline: string;
  onComplete: (auditedArticle: string) => void;
}

interface AuditSection {
  id: string;
  sectionNumber: number;
  title: string;
  originalContent?: string;
  auditedContent?: string;
  strengths?: string;
  weaknesses?: string;
  editingPattern?: string;
  citationsAdded?: number;
  status: 'pending' | 'auditing' | 'completed' | 'error';
  errorMessage?: string;
  auditMetadata?: {
    headerLevel?: 'h2' | 'h3';
    level?: 'section' | 'subsection';
    parentSection?: string;
  };
}

interface AuditProgress {
  session: {
    id: string;
    status: 'pending' | 'auditing' | 'completed' | 'error';
    totalSections: number;
    completedSections: number;
    totalCitationsUsed: number;
    errorMessage?: string;
  };
  sections: AuditSection[];
  progress: {
    total: number;
    completed: number;
    citationsUsed: number;
    citationsRemaining: number;
  };
}

export const AgenticSemanticAuditor = ({ 
  workflowId, 
  originalArticle, 
  researchOutline, 
  onComplete 
}: AgenticSemanticAuditorProps) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [auditResults, setAuditResults] = useState<Array<{
    title: string;
    strengths: string;
    weaknesses: string;
    optimizedContent: string;
    editingPattern: string;
    citationsAdded: number;
  }>>([]);
  const [finalAuditedArticle, setFinalAuditedArticle] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startAudit = async () => {
    if (!originalArticle.trim()) {
      setError('Original article is required. Please complete Article Draft step first.');
      return;
    }

    if (!researchOutline.trim()) {
      setError('Research outline is required. Please complete Deep Research step first.');
      return;
    }

    setIsAuditing(true);
    setError(null);
    setLogs([]);
    setAuditResults([]);
    setFinalAuditedArticle('');
    addLog('Starting semantic SEO audit...');

    try {
      // Start audit
      const response = await fetch(`/api/workflows/${workflowId}/semantic-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalArticle, 
          researchOutline 
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start semantic audit');
      }

      setSessionId(result.sessionId);
      addLog(`Audit session created: ${result.sessionId}`);
      
      // Start SSE connection for real-time updates
      startEventStream(result.sessionId);

    } catch (err: any) {
      setError(err.message);
      setIsAuditing(false);
      addLog(`Error: ${err.message}`);
    }
  };

  const startEventStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/semantic-audit/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            addLog('Connected to audit stream');
            break;
            
          case 'progress':
            setProgress(data);
            
            // Log audit updates
            if (data.session.status === 'auditing') {
              const currentSection = data.sections.find((s: AuditSection) => s.status === 'auditing');
              if (currentSection) {
                addLog(`Auditing section ${currentSection.sectionNumber}: "${currentSection.title}"`);
              }
            }
            break;
            
          case 'parsed':
            addLog(`Article parsed into ${data.totalSections} sections`);
            break;
            
          case 'section_completed':
            addLog(`✅ Audited "${data.section_title}" (Pattern: ${data.editing_pattern}, Citations: +${data.citations_added})`);
            
            // Add to audit results for display
            setAuditResults(prev => [...prev, {
              title: data.section_title,
              strengths: data.strengths,
              weaknesses: data.weaknesses,
              optimizedContent: data.optimized_content,
              editingPattern: data.editing_pattern,
              citationsAdded: data.citations_added
            }]);
            break;
            
          case 'completed':
            setIsAuditing(false);
            eventSource.close();
            
            addLog('🎉 Semantic SEO audit completed successfully!');
            
            if (data.finalAuditedArticle) {
              addLog(`Final audit: ${data.totalSections} sections, ${data.totalCitationsUsed} citations, patterns: ${data.editingPatterns?.join(', ')}`);
              setFinalAuditedArticle(data.finalAuditedArticle);
              onComplete(data.finalAuditedArticle);
            } else {
              addLog('Warning: No final audited article received');
              setError('No final audited article received');
            }
            break;
            
          case 'error':
            setError(data.message);
            setIsAuditing(false);
            eventSource.close();
            addLog(`❌ Error: ${data.message}`);
            break;
            
          case 'tool_call':
            if (data.name === 'file_search') {
              addLog(`🔍 Searching semantic SEO knowledge: "${data.query}"`);
            } else {
              addLog(`🔧 Using tool: ${data.name}`);
            }
            break;
        }
      } catch (err) {
        console.error('Error parsing audit SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      addLog('Connection lost, retrying...');
    };
  };

  const stopAudit = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsAuditing(false);
    addLog('Audit stopped by user');
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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'auditing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const progressPercentage = progress 
    ? Math.round((progress.progress.completed / progress.progress.total) * 100) 
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Search className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Semantic SEO Auditor</h3>
            <p className="text-sm text-gray-600">Automated section-by-section semantic SEO optimization</p>
          </div>
        </div>
        
        {!isAuditing ? (
          <button
            onClick={startAudit}
            disabled={!originalArticle.trim() || !researchOutline.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>Start Audit</span>
          </button>
        ) : (
          <button
            onClick={stopAudit}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
          {/* Overall Progress */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Audit Progress</span>
              <span className="text-sm text-gray-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Status: {progress.session.status}</span>
              <span>
                Citations: {progress.progress.citationsUsed}/3 used, {progress.progress.citationsRemaining} remaining
              </span>
            </div>
          </div>

          {/* Sections List */}
          {progress.sections.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Article Sections</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {progress.sections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(section.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {section.auditMetadata?.level === 'subsection' && '   └─ '}
                          {section.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {section.auditMetadata?.level === 'subsection' && (
                            <span className="bg-gray-100 px-1 rounded">H3</span>
                          )}
                          {section.auditMetadata?.level === 'section' && (
                            <span className="bg-blue-100 px-1 rounded">H2</span>
                          )}
                          {section.editingPattern && (
                            <span>Pattern: {section.editingPattern}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 capitalize">{section.status}</span>
                      {section.citationsAdded !== undefined && section.citationsAdded > 0 && (
                        <p className="text-xs text-blue-600">+{section.citationsAdded} citations</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Results Preview */}
      {auditResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Audit Results</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <h5 className="font-medium text-gray-900">{result.title}</h5>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{result.editingPattern}</span>
                  {result.citationsAdded > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      +{result.citationsAdded} citations
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-green-700 mb-1">Strengths:</p>
                    <p className="text-gray-600">{result.strengths}</p>
                  </div>
                  <div>
                    <p className="font-medium text-orange-700 mb-1">Improvements:</p>
                    <p className="text-gray-600">{result.weaknesses}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Audited Article */}
      {finalAuditedArticle && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Final Audited Article</span>
          </h4>
          
          {/* Article Text Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              SEO-Optimized Article (Markdown)
            </label>
            <textarea
              value={finalAuditedArticle}
              readOnly
              className="w-full h-64 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="The final audited article will appear here..."
            />
          </div>

          {/* HTML Preview */}
          <MarkdownPreview 
            content={finalAuditedArticle}
            className="mt-4"
          />
        </div>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Activity Log</h4>
          <div className="bg-gray-50 border border-gray-200 text-gray-800 text-xs p-3 rounded-lg max-h-40 overflow-y-auto font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isAuditing && !progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How the Semantic SEO Audit works:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. AI analyzes your article content and research context</li>
            <li>2. Parses article into sections for systematic review</li>
            <li>3. Audits each section against semantic SEO best practices</li>
            <li>4. Identifies strengths, weaknesses, and optimization opportunities</li>
            <li>5. Provides optimized content with varied editing patterns</li>
            <li>6. Tracks citation usage (max 3 total) and editing variety</li>
          </ol>
        </div>
      )}
    </div>
  );
};
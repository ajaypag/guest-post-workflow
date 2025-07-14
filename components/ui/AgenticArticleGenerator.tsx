'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, AlertCircle, Clock, FileText, Zap } from 'lucide-react';

interface AgenticArticleGeneratorProps {
  workflowId: string;
  outline: string;
  onComplete: (article: string) => void;
}

interface Section {
  id: string;
  sectionNumber: number;
  title: string;
  content?: string;
  wordCount?: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
  errorMessage?: string;
}

interface SessionProgress {
  session: {
    id: string;
    status: 'pending' | 'planning' | 'writing' | 'completed' | 'error';
    totalSections: number;
    completedSections: number;
    targetWordCount: number;
    currentWordCount: number;
    errorMessage?: string;
  };
  sections: Section[];
  progress: {
    total: number;
    completed: number;
    currentWordCount: number;
    targetWordCount: number;
  };
}

export const AgenticArticleGenerator = ({ workflowId, outline, onComplete }: AgenticArticleGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startGeneration = async () => {
    if (!outline.trim()) {
      setError('Please complete Deep Research step first to get the outline.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLogs([]);
    addLog('Starting agentic article generation...');

    try {
      // Start generation
      const response = await fetch(`/api/workflows/${workflowId}/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start generation');
      }

      setSessionId(result.sessionId);
      addLog(`Session created: ${result.sessionId}`);
      
      // Start SSE connection for real-time updates
      startEventStream(result.sessionId);

    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
      addLog(`Error: ${err.message}`);
    }
  };

  const startEventStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/auto-generate/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            addLog('Connected to real-time updates');
            break;
            
          case 'progress':
            setProgress(data);
            
            // Log section updates
            if (data.session.status === 'planning') {
              addLog('AI is planning article structure...');
            } else if (data.session.status === 'writing') {
              const currentSection = data.sections.find((s: Section) => s.status === 'generating');
              if (currentSection) {
                addLog(`Writing section ${currentSection.sectionNumber}: "${currentSection.title}"`);
              }
              
              const completedSection = data.sections.find((s: Section) => 
                s.status === 'completed' && s.sectionNumber === data.session.completedSections
              );
              if (completedSection) {
                addLog(`✅ Completed "${completedSection.title}" (${completedSection.wordCount} words)`);
              }
            }
            break;
            
          case 'complete':
            setIsGenerating(false);
            eventSource.close();
            
            if (data.status === 'completed') {
              addLog('🎉 Article generation completed successfully!');
              
              // Compile final article from sections
              if (progress?.sections) {
                const finalArticle = progress.sections
                  .filter(s => s.status === 'completed')
                  .sort((a, b) => a.sectionNumber - b.sectionNumber)
                  .map(s => `## ${s.title}\n\n${s.content}`)
                  .join('\n\n');
                
                onComplete(finalArticle);
              }
            } else {
              addLog(`❌ Generation failed: ${data.errorMessage}`);
              setError(data.errorMessage || 'Generation failed');
            }
            break;
            
          case 'error':
            setError(data.message);
            setIsGenerating(false);
            eventSource.close();
            addLog(`❌ Error: ${data.message}`);
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      addLog('Connection lost, retrying...');
    };
  };

  const stopGeneration = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsGenerating(false);
    addLog('Generation stopped by user');
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
      case 'generating':
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
          <Zap className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Agent Article Generator</h3>
            <p className="text-sm text-gray-600">Fully automated article writing using OpenAI Agents</p>
          </div>
        </div>
        
        {!isGenerating ? (
          <button
            onClick={startGeneration}
            disabled={!outline.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>Start Generation</span>
          </button>
        ) : (
          <button
            onClick={stopGeneration}
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
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Status: {progress.session.status}</span>
              <span>
                {progress.progress.currentWordCount} / {progress.progress.targetWordCount} words
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
                        <p className="text-sm font-medium text-gray-900">{section.title}</p>
                        {section.wordCount && (
                          <p className="text-xs text-gray-500">{section.wordCount} words</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{section.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
      {!isGenerating && !progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. AI analyzes your research outline and plans article structure</li>
            <li>2. Determines optimal word count allocation per section</li>
            <li>3. Writes each section with narrative flow and proper transitions</li>
            <li>4. Enforces style rules (short paragraphs, no em-dashes, etc.)</li>
            <li>5. Provides real-time progress updates as it writes</li>
          </ol>
        </div>
      )}
    </div>
  );
};
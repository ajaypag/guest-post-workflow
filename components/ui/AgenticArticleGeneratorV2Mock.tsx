'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, AlertCircle, Clock, FileText, Brain, RefreshCw, Settings, Bug } from 'lucide-react';

interface AgenticArticleGeneratorV2MockProps {
  workflowId: string;
  outline: string;
  onComplete: (article: string) => void;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
}

interface MockConfig {
  delayBetweenSections: number;
  totalSections: number;
  simulateError: boolean;
  errorAtSection?: number;
  simulateCompletionError: boolean;
}

export const AgenticArticleGeneratorV2Mock = ({ workflowId, outline, onComplete, onGeneratingStateChange }: AgenticArticleGeneratorV2MockProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [completedSections, setCompletedSections] = useState(0);
  const [mockArticle, setMockArticle] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [mockConfig, setMockConfig] = useState<MockConfig>({
    delayBetweenSections: 2000,
    totalSections: 8,
    simulateError: false,
    errorAtSection: 5,
    simulateCompletionError: true
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Report generating state changes to parent
  useEffect(() => {
    onGeneratingStateChange?.(isGenerating);
  }, [isGenerating, onGeneratingStateChange]);

  const startGeneration = () => {
    if (!outline.trim()) {
      setError('Please complete Deep Research step first to get the outline.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLogs([]);
    setCompletedSections(0);
    setMockArticle('');
    addLog('🚀 Starting V2 MOCK generation...');
    addLog('⚠️ MOCK MODE: This is simulated data for testing UI behavior');

    // Initial status
    setProgress({
      session: {
        id: 'mock-session-' + Date.now(),
        status: 'orchestrating',
        totalSections: 0,
        completedSections: 0,
        currentWordCount: 0,
        totalWordCount: 0,
        outline: outline,
        errorMessage: null
      },
      progress: {
        status: 'orchestrating',
        totalSections: 0,
        completedSections: 0
      }
    });

    // Simulate orchestration phase
    setTimeout(() => {
      addLog('🧠 Orchestrator analyzing research and planning article...');
      setProgress((prev: any) => ({
        ...prev,
        session: {
          ...prev.session,
          status: 'writing',
          totalSections: mockConfig.totalSections
        },
        progress: {
          ...prev.progress,
          status: 'writing',
          totalSections: mockConfig.totalSections
        }
      }));
      addLog(`📋 Orchestrator created outline with ${mockConfig.totalSections} sections`);

      // Start writing sections
      let currentSection = 0;
      let article = '# Mock Article Title\n\n';
      
      intervalRef.current = setInterval(() => {
        currentSection++;
        
        // Check for simulated error
        if (mockConfig.simulateError && currentSection === mockConfig.errorAtSection) {
          addLog(`❌ Error at section ${currentSection}: Simulated error for testing`);
          setError('Simulated error occurred during generation');
          setIsGenerating(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        addLog(`✍️ Writer agent starting: "Section ${currentSection}"`);
        
        // Add mock content
        article += `## Section ${currentSection}: Mock Heading\n\n`;
        article += `This is mock content for section ${currentSection}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. `;
        article += `Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n`;
        
        setMockArticle(article);
        setCompletedSections(currentSection);
        
        setProgress((prev: any) => ({
          ...prev,
          session: {
            ...prev.session,
            completedSections: currentSection,
            currentWordCount: article.split(/\s+/).length
          },
          progress: {
            ...prev.progress,
            completedSections: currentSection,
            currentSection: `Section ${currentSection}`
          }
        }));

        addLog(`✅ Completed section ${currentSection}`);

        // Check if done
        if (currentSection >= mockConfig.totalSections) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          
          // Add conclusion
          article += '## Conclusion\n\nThis concludes our mock article for testing purposes.\n';
          setMockArticle(article);
          
          addLog('🎉 V2 article generation completed successfully!');
          addLog(`📊 Final article: ${article.split(/\s+/).length} words`);
          
          // Simulate completion with potential error
          if (mockConfig.simulateCompletionError) {
            setError('Mock completion error - refresh page to see article');
            addLog('⚠️ Warning: Simulated completion error for testing');
          }
          
          setProgress((prev: any) => ({
            ...prev,
            session: {
              ...prev.session,
              status: 'completed',
              finalArticle: article
            }
          }));
          
          setIsGenerating(false);
          
          // Call onComplete even with error to test saving behavior
          onComplete(article);
        }
      }, mockConfig.delayBetweenSections);
    }, 2000);
  };

  const stopGeneration = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsGenerating(false);
    addLog('⏹️ Generation stopped by user');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'orchestrating':
        return <Brain className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'writing':
        return <FileText className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const hasKnownTotal = progress?.session.totalSections && progress.session.totalSections > 0;
  const progressPercentage = hasKnownTotal
    ? Math.round((progress.session.completedSections / progress.session.totalSections) * 100) 
    : 0;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Bug className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Agent V2 - MOCK TEST MODE</h3>
            <p className="text-sm text-gray-600">Simulated generation for testing UI behavior</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          {!isGenerating ? (
            <button
              onClick={startGeneration}
              disabled={!outline.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Play className="w-4 h-4" />
              <span>Start Mock Generation</span>
            </button>
          ) : (
            <button
              onClick={stopGeneration}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md"
            >
              <Pause className="w-4 h-4" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Mock Configuration */}
      {showConfig && (
        <div className="bg-white border border-orange-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">Mock Configuration</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delay Between Sections (ms)
              </label>
              <input
                type="number"
                value={mockConfig.delayBetweenSections}
                onChange={(e) => setMockConfig(prev => ({
                  ...prev,
                  delayBetweenSections: parseInt(e.target.value) || 1000
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="100"
                step="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Sections
              </label>
              <input
                type="number"
                value={mockConfig.totalSections}
                onChange={(e) => setMockConfig(prev => ({
                  ...prev,
                  totalSections: parseInt(e.target.value) || 5
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1"
                max="20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mockConfig.simulateError}
                onChange={(e) => setMockConfig(prev => ({
                  ...prev,
                  simulateError: e.target.checked
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Simulate error during generation</span>
            </label>
            
            {mockConfig.simulateError && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Error at section:
                </label>
                <input
                  type="number"
                  value={mockConfig.errorAtSection}
                  onChange={(e) => setMockConfig(prev => ({
                    ...prev,
                    errorAtSection: parseInt(e.target.value) || 5
                  }))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  max={mockConfig.totalSections}
                />
              </div>
            )}
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mockConfig.simulateCompletionError}
                onChange={(e) => setMockConfig(prev => ({
                  ...prev,
                  simulateCompletionError: e.target.checked
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Simulate completion error notification</span>
            </label>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-800">{error}</p>
                <p className="text-xs text-red-600 mt-1">
                  Note: This is a mock error for testing. Article may have been saved successfully.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              title="Refresh page"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {progress && (
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(progress.session.status)}
                <span className="font-medium text-gray-900 capitalize">{progress.session.status}</span>
              </div>
              {hasKnownTotal && (
                <span className="text-sm text-gray-600">
                  {progressPercentage}% Complete
                </span>
              )}
            </div>
            
            {/* Progress Bar */}
            {hasKnownTotal && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
            
            {/* Stats */}
            {(progress.session.completedSections > 0 || hasKnownTotal) && (
              <div className="text-sm">
                <span className="text-gray-500">Sections:</span>
                <span className="ml-2 font-medium">
                  {hasKnownTotal 
                    ? `${progress.session.completedSections} / ${progress.session.totalSections}`
                    : `${progress.session.completedSections} completed`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Current Activity */}
          {progress.progress.currentSection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Currently writing:</span> {progress.progress.currentSection}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mock Article Preview */}
      {mockArticle && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Mock Article Preview</h4>
          <div className="bg-white/60 backdrop-blur border border-orange-200 rounded-lg p-4 max-h-40 overflow-y-auto">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
              {mockArticle}
            </pre>
          </div>
        </div>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Activity Log</h4>
          <div className="bg-white/60 backdrop-blur border border-orange-200 text-gray-800 text-xs p-3 rounded-lg max-h-40 overflow-y-auto font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isGenerating && !progress && (
        <div className="bg-gradient-to-br from-orange-100 to-red-100 border border-orange-300 rounded-lg p-4">
          <h4 className="font-medium text-orange-900 mb-2">Mock Testing Mode:</h4>
          <ul className="text-sm text-orange-800 space-y-1">
            <li>• This mode simulates the V2 generation process without API calls</li>
            <li>• Configure delays and error scenarios above</li>
            <li>• Test UI behavior for errors, refresh, and completion states</li>
            <li>• Mock article will be saved to test persistence</li>
          </ul>
        </div>
      )}
    </div>
  );
};
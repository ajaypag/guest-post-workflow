'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Database, Save, Clock } from 'lucide-react';

interface AutoSaveEvent {
  timestamp: string;
  stepId: string;
  workflowId: string;
  eventType: 'debounce-start' | 'debounce-reset' | 'save-triggered' | 'save-success' | 'save-error' | 'force-save';
  data?: any;
  error?: string;
}

interface DiagnosticResult {
  workflowSteps: any[];
  recentAutoSaves: AutoSaveEvent[];
  v2Sessions: any[];
  stepData: {
    [stepId: string]: any;
  };
  issues: string[];
  recommendations: string[];
}

interface V2FieldAnalysis {
  semanticSeoStep: any;
  articleDraftStep: any;
  issues: string[];
  recommendations: string[];
}

export default function AutoSaveDiagnosticsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const [v2Analysis, setV2Analysis] = useState<V2FieldAnalysis | null>(null);
  const [workflowId, setWorkflowId] = useState('');
  const [monitoring, setMonitoring] = useState(false);
  const [liveEvents, setLiveEvents] = useState<AutoSaveEvent[]>([]);
  const [recentWorkflows, setRecentWorkflows] = useState<any[]>([]);

  // Fetch recent workflows on mount
  useEffect(() => {
    const fetchRecentWorkflows = async () => {
      try {
        const response = await fetch('/api/workflows?limit=10&orderBy=createdAt&order=desc');
        const data = await response.json();
        setRecentWorkflows(data.workflows || []);
      } catch (error) {
        console.error('Failed to fetch recent workflows:', error);
      }
    };
    fetchRecentWorkflows();
  }, []);

  // Listen for auto-save events
  useEffect(() => {
    if (!monitoring) return;

    const handleAutoSaveEvent = (event: CustomEvent) => {
      const autoSaveEvent: AutoSaveEvent = {
        timestamp: new Date().toISOString(),
        stepId: event.detail.stepId || 'unknown',
        workflowId: event.detail.workflowId || workflowId,
        eventType: event.detail.type,
        data: event.detail.data,
        error: event.detail.error
      };
      
      setLiveEvents(prev => [autoSaveEvent, ...prev].slice(0, 50)); // Keep last 50 events
    };

    // Listen for all auto-save related events
    window.addEventListener('autosave-debounce-start', handleAutoSaveEvent as any);
    window.addEventListener('autosave-debounce-reset', handleAutoSaveEvent as any);
    window.addEventListener('autosave-triggered', handleAutoSaveEvent as any);
    window.addEventListener('autosave-success', handleAutoSaveEvent as any);
    window.addEventListener('autosave-error', handleAutoSaveEvent as any);
    window.addEventListener('force-step-save', handleAutoSaveEvent as any);

    return () => {
      window.removeEventListener('autosave-debounce-start', handleAutoSaveEvent as any);
      window.removeEventListener('autosave-debounce-reset', handleAutoSaveEvent as any);
      window.removeEventListener('autosave-triggered', handleAutoSaveEvent as any);
      window.removeEventListener('autosave-success', handleAutoSaveEvent as any);
      window.removeEventListener('autosave-error', handleAutoSaveEvent as any);
      window.removeEventListener('force-step-save', handleAutoSaveEvent as any);
    };
  }, [monitoring, workflowId]);

  const runDiagnostics = async () => {
    if (!workflowId.trim()) {
      alert('Please enter a workflow ID');
      return;
    }

    setLoading(true);
    try {
      // Use the simple query endpoint that works
      const simpleResponse = await fetch('/api/admin/test-simple-workflow-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId })
      });

      const simpleData = await simpleResponse.json();
      
      if (simpleData.success) {
        // Convert simple data to expected format
        const mockResults = {
          workflowSteps: simpleData.steps.map((s: any, idx: number) => ({
            id: s.id,
            stepNumber: idx,
            title: s.title,
            status: s.status,
            inputs: { 
              stepType: s.stepType,
              semanticAuditedArticleV2: s.hasSemanticV2 ? 'Has data' : undefined,
              articleDraftV2: s.hasArticleV2 ? 'Has data' : undefined
            },
            outputs: {},
            updatedAt: new Date()
          })),
          v2Sessions: [],
          recentAutoSaves: [],
          stepData: {},
          issues: simpleData.analysis.issues,
          recommendations: simpleData.analysis.recommendations
        };
        
        setResults(mockResults);
        
        // Set V2 analysis from simple data
        if (simpleData.analysis.semanticStep || simpleData.analysis.articleStep) {
          setV2Analysis({
            semanticSeoStep: simpleData.analysis.semanticStep ? {
              hasV1Field: simpleData.analysis.semanticStep.hasV1SemanticData,
              hasV2Field: simpleData.analysis.semanticStep.hasSemanticV2,
              v1FieldLength: 0,
              v2FieldLength: simpleData.analysis.semanticStep.semanticV2Length
            } : null,
            articleDraftStep: simpleData.analysis.articleStep ? {
              hasV1Field: simpleData.analysis.articleStep.hasV1ArticleData,
              hasV2Field: simpleData.analysis.articleStep.hasArticleV2,
              v1FieldLength: 0,
              v2FieldLength: simpleData.analysis.articleStep.articleV2Length
            } : null,
            issues: simpleData.analysis.issues,
            recommendations: simpleData.analysis.recommendations
          });
        }
      } else {
        alert('Diagnostic failed: ' + simpleData.error);
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      alert('Diagnostic failed - check console for details');
    } finally {
      setLoading(false);
    }
  };

  const testAutoSave = async (stepId: string) => {
    try {
      const response = await fetch('/api/admin/test-autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workflowId,
          stepId,
          testData: {
            content: 'Test auto-save data',
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      alert(`Test ${result.success ? 'succeeded' : 'failed'}: ${result.message}`);
      
      // Refresh diagnostics
      runDiagnostics();
    } catch (error) {
      alert(`Test failed: ${error}`);
    }
  };

  const fixV2Fields = async () => {
    if (!confirm('This will move V2 data from wrong fields to correct fields. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/fix-v2-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, fixType: 'all' })
      });

      const result = await response.json();
      alert(result.message);
      
      // Refresh diagnostics
      runDiagnostics();
    } catch (error) {
      alert(`Fix failed: ${error}`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Auto-Save Diagnostics</h1>

      {/* Recent Workflows */}
      <div className="bg-gray-50 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Recent Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentWorkflows.length === 0 ? (
            <div className="text-gray-500">Loading workflows...</div>
          ) : (
            recentWorkflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{workflow.title || 'Untitled Workflow'}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(workflow.createdAt).toLocaleDateString()} • ID: {workflow.id.substring(0, 8)}...
                  </div>
                </div>
                <button
                  onClick={() => {
                    setWorkflowId(workflow.id);
                    navigator.clipboard.writeText(workflow.id);
                  }}
                  className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium"
                  title="Click to use this workflow ID"
                >
                  Use ID
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
            placeholder="Enter Workflow ID"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>
          <button
            onClick={() => setMonitoring(!monitoring)}
            className={`px-6 py-2 rounded-lg ${
              monitoring 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
        
        {/* Database Column Check */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center space-x-4">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/check-actual-columns');
                  const data = await response.json();
                  console.log('Column check:', data);
                  alert(`Database Columns:\n${JSON.stringify(data.columnNames, null, 2)}\n\nDiagnosis: ${data.diagnosis.stepNumberIssue}`);
                } catch (error) {
                  alert('Failed to check columns: ' + error);
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Check Database Columns
            </button>
            
            <button
              onClick={async () => {
                try {
                  // First check if migration is needed
                  const checkResponse = await fetch('/api/admin/add-step-number-column');
                  const checkData = await checkResponse.json();
                  
                  if (!checkData.needsMigration) {
                    alert('Migration not needed: ' + checkData.message);
                    return;
                  }
                  
                  if (confirm('Add step_number column to workflow_steps table?')) {
                    const response = await fetch('/api/admin/add-step-number-column', {
                      method: 'POST'
                    });
                    const data = await response.json();
                    alert(data.message || data.error);
                  }
                } catch (error) {
                  alert('Migration failed: ' + error);
                }
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Add step_number Column
            </button>
          </div>
        </div>
      </div>

      {/* Live Event Monitor */}
      {monitoring && (
        <div className="bg-gray-900 text-gray-100 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Live Auto-Save Events
          </h2>
          <div className="max-h-64 overflow-y-auto font-mono text-sm">
            {liveEvents.length === 0 ? (
              <div className="text-gray-400">Waiting for auto-save events...</div>
            ) : (
              liveEvents.map((event, idx) => (
                <div 
                  key={idx} 
                  className={`mb-2 p-2 rounded ${
                    event.eventType === 'save-error' ? 'bg-red-900' :
                    event.eventType === 'save-success' ? 'bg-green-900' :
                    event.eventType === 'force-save' ? 'bg-purple-900' :
                    'bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="text-yellow-400">
                      [{new Date(event.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className="text-cyan-400">{event.eventType}</span>
                  </div>
                  <div className="text-xs mt-1">
                    Step: {event.stepId} | Workflow: {event.workflowId}
                  </div>
                  {event.data && (
                    <div className="text-xs mt-1 text-gray-400">
                      Data: {JSON.stringify(event.data).substring(0, 100)}...
                    </div>
                  )}
                  {event.error && (
                    <div className="text-xs mt-1 text-red-400">
                      Error: {event.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* V2 Field Analysis */}
      {v2Analysis && v2Analysis.issues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center text-red-800">
            <AlertCircle className="w-5 h-5 mr-2" />
            V2 Field Naming Issues
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-red-700 mb-2">Critical Issues:</h3>
              <ul className="space-y-2">
                {v2Analysis.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-red-700">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {v2Analysis.semanticSeoStep && (
              <div className="mt-4 p-3 bg-white rounded border border-red-300">
                <h4 className="font-medium text-red-800 mb-2">Semantic SEO Step Analysis:</h4>
                <div className="text-sm space-y-1">
                  <div>V1 Field (outputs.seoOptimizedArticle): {v2Analysis.semanticSeoStep.hasV1Field ? `✓ Present (${v2Analysis.semanticSeoStep.v1FieldLength} chars)` : '✗ Missing'}</div>
                  <div>V2 Field (inputs.semanticAuditedArticleV2): {v2Analysis.semanticSeoStep.hasV2Field ? `✓ Present (${v2Analysis.semanticSeoStep.v2FieldLength} chars)` : '✗ Missing'}</div>
                </div>
              </div>
            )}
            
            {v2Analysis.articleDraftStep && (
              <div className="mt-4 p-3 bg-white rounded border border-red-300">
                <h4 className="font-medium text-red-800 mb-2">Article Draft Step Analysis:</h4>
                <div className="text-sm space-y-1">
                  <div>V1 Field (outputs.fullArticle): {v2Analysis.articleDraftStep.hasV1Field ? `✓ Present (${v2Analysis.articleDraftStep.v1FieldLength} chars)` : '✗ Missing'}</div>
                  <div>V2 Field (inputs.articleDraftV2): {v2Analysis.articleDraftStep.hasV2Field ? `✓ Present (${v2Analysis.articleDraftStep.v2FieldLength} chars)` : '✗ Missing'}</div>
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <button
                onClick={fixV2Fields}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Fix V2 Field Issues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Results */}
      {results && (
        <>
          {/* Issues Summary */}
          {results.issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                Issues Found
              </h2>
              <ul className="space-y-2">
                {results.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-red-700">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Workflow Steps */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Workflow Steps Data
            </h2>
            <div className="space-y-4">
              {results.workflowSteps.map((step) => (
                <div key={step.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{step.title}</h3>
                      <p className="text-sm text-gray-600">Step: {step.stepNumber} | Type: {step.inputs?.stepType}</p>
                    </div>
                    <button
                      onClick={() => testAutoSave(step.inputs?.stepType || step.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Test Save
                    </button>
                  </div>
                  
                  {/* Show V2 specific data */}
                  {(step.inputs?.stepType === 'semantic-seo' || step.inputs?.stepType === 'article-draft') && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium mb-1">V2 Data Status:</div>
                      <div>Semantic Audit V2: {step.inputs?.semanticAuditedArticleV2 ? '✓ Present' : '✗ Missing'}</div>
                      <div>Article Draft V2: {step.inputs?.articleDraftV2 ? '✓ Present' : '✗ Missing'}</div>
                      {step.inputs?.semanticAuditedArticleV2 && (
                        <div className="text-xs text-gray-500 mt-1">
                          V2 Content Length: {step.inputs.semanticAuditedArticleV2.length} chars
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    Last Updated: {new Date(step.updatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* V2 Sessions */}
          {results.v2Sessions.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">V2 Agent Sessions</h2>
              <div className="space-y-2">
                {results.v2Sessions.map((session) => (
                  <div key={session.id} className="border rounded p-3">
                    <div className="flex justify-between">
                      <span className="font-medium">{session.stepId}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Session: {session.id}
                    </div>
                    {session.finalArticle && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Has final article ({session.finalArticle.length} chars)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {results.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-800">Recommendations</h2>
              <ul className="space-y-2">
                {results.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-blue-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
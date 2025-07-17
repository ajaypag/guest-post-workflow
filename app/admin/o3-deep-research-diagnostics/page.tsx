'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2, Zap, Search, Activity } from 'lucide-react';

interface DiagnosticResult {
  apiConfiguration: {
    status: string;
    issues: string[];
    details: any;
  };
  activeSessions: {
    count: number;
    sessions: any[];
  };
  failedSessions: {
    count: number;
    sessions: any[];
    commonErrors: { [key: string]: number };
  };
  systemHealth: {
    openAIConnection: boolean;
    databaseConnection: boolean;
    toolsConfiguration: boolean;
  };
  recommendations: string[];
}

export default function O3DeepResearchDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testInProgress, setTestInProgress] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Auto-run diagnostics on page load
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const response = await fetch('/api/admin/diagnose-o3-deep-research', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to run diagnostics');
      }

      const data = await response.json();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanupFailedSessions = async () => {
    if (!confirm('This will mark all failed sessions as inactive. Continue?')) return;

    try {
      const response = await fetch('/api/admin/cleanup-failed-outline-sessions', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup sessions');
      }

      const data = await response.json();
      alert(`Cleaned up ${data.cleaned} failed sessions`);
      runDiagnostics(); // Refresh diagnostics
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const testO3API = async () => {
    setTestInProgress(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/test-o3-api-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPrompt: 'Create a brief outline for an article about sustainable living.'
        })
      });

      const data = await response.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestInProgress(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">O3 Deep Research Diagnostics</h1>
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Diagnostics
            </button>
          </div>

          {/* Critical Alert */}
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Known Issue</h3>
                <p className="text-sm text-red-700 mt-1">
                  Error: "Deep research models require at least one of 'web_search_preview' or 'mcp' tools"
                </p>
                <p className="text-sm text-red-700 mt-1">
                  This diagnostic page will help identify and fix configuration issues.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {diagnostics && (
            <div className="space-y-6">
              {/* System Health */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Health
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    {diagnostics.systemHealth.openAIConnection ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>OpenAI Connection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {diagnostics.systemHealth.databaseConnection ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>Database Connection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {diagnostics.systemHealth.toolsConfiguration ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>Tools Configuration</span>
                  </div>
                </div>
              </div>

              {/* API Configuration */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  API Configuration Analysis
                  {getStatusIcon(diagnostics.apiConfiguration.status)}
                </h2>
                
                {diagnostics.apiConfiguration.issues.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h3 className="font-semibold text-red-600">Issues Found:</h3>
                    {diagnostics.apiConfiguration.issues.map((issue, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-700">{issue}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-gray-50 rounded p-4">
                  <h4 className="font-semibold mb-2">Current Configuration:</h4>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(diagnostics.apiConfiguration.details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Active Sessions ({diagnostics.activeSessions.count})
                </h2>
                
                {diagnostics.activeSessions.sessions.length > 0 ? (
                  <div className="space-y-3">
                    {diagnostics.activeSessions.sessions.map((session: any) => (
                      <div key={session.id} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-sm">{session.id}</p>
                            <p className="text-sm text-gray-600">
                              Workflow: {session.workflowId} | Status: {session.status}
                            </p>
                            <p className="text-xs text-gray-500">
                              Started: {new Date(session.startedAt).toLocaleString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No active sessions found</p>
                )}
              </div>

              {/* Failed Sessions */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Failed Sessions ({diagnostics.failedSessions.count})
                  </h2>
                  {diagnostics.failedSessions.count > 0 && (
                    <button
                      onClick={cleanupFailedSessions}
                      className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clean Up Failed
                    </button>
                  )}
                </div>

                {Object.keys(diagnostics.failedSessions.commonErrors).length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Common Errors:</h3>
                    <div className="space-y-2">
                      {Object.entries(diagnostics.failedSessions.commonErrors).map(([error, count]) => (
                        <div key={error} className="flex justify-between items-center bg-red-50 border border-red-200 rounded p-2">
                          <p className="text-sm text-red-700">{error}</p>
                          <span className="text-xs font-medium bg-red-600 text-white px-2 py-1 rounded">
                            {count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Test API Call */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Test O3 API Call</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Test the O3 deep research API call with proper tools configuration
                </p>
                
                <button
                  onClick={testO3API}
                  disabled={testInProgress}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {testInProgress ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Test API Call
                </button>

                {testResult && (
                  <div className="mt-4 bg-gray-50 rounded p-4">
                    <h4 className="font-semibold mb-2">Test Result:</h4>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {diagnostics.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 text-blue-800">Recommendations</h2>
                  <ul className="space-y-2">
                    {diagnostics.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span className="text-sm text-blue-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Diagnostics */}
              <details className="bg-white border rounded-lg p-6">
                <summary className="cursor-pointer font-semibold mb-4">Raw Diagnostic Data</summary>
                <pre className="text-xs overflow-x-auto bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
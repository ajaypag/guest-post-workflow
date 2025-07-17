'use client';

import { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw, Settings, Zap } from 'lucide-react';

export default function StreamingDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any>(null);

  // Auto-run diagnostics on page load
  useEffect(() => {
    runDiagnostics();
    loadFeatureFlags();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const response = await fetch('/api/admin/diagnose-streaming-health', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to run streaming diagnostics');
      }

      const data = await response.json();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureFlags = async () => {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setFeatureFlags(data);
      }
    } catch (err) {
      console.error('Failed to load feature flags:', err);
    }
  };

  const testStreamingConnection = async () => {
    try {
      const response = await fetch('/api/admin/test-streaming-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testWorkflowId: 'streaming-test-workflow'
        })
      });

      const data = await response.json();
      setTestResults(data);
    } catch (err: any) {
      setTestResults({ error: err.message });
    }
  };

  const toggleStreaming = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/toggle-streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        loadFeatureFlags();
        runDiagnostics();
      }
    } catch (err) {
      console.error('Failed to toggle streaming:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'unhealthy': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Streaming Diagnostics</h1>
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

          {/* Feature Flags Status */}
          {featureFlags && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Feature Flags
                </h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={featureFlags.streamingEnabled}
                      onChange={(e) => toggleStreaming(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Enable Streaming</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  {featureFlags.streamingEnabled ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">Streaming: {featureFlags.streamingEnabled ? 'ON' : 'OFF'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Fallback: {featureFlags.fallbackEnabled ? 'ON' : 'OFF'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Debug: {featureFlags.debugEnabled ? 'ON' : 'OFF'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Timeout: {featureFlags.streamingTimeout / 1000}s</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {diagnostics && (
            <div className="space-y-6">
              {/* System Health Overview */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Health Overview
                  {getStatusIcon(diagnostics.overallStatus)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    <div className={`w-3 h-3 rounded-full ${
                      diagnostics.streaming.available ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">Streaming Service</p>
                      <p className="text-sm text-gray-600">
                        {diagnostics.streaming.available ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    <div className={`w-3 h-3 rounded-full ${
                      diagnostics.polling.available ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">Polling Service</p>
                      <p className="text-sm text-gray-600">
                        {diagnostics.polling.available ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    <div className={`w-3 h-3 rounded-full ${
                      diagnostics.database.connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">Database</p>
                      <p className="text-sm text-gray-600">
                        {diagnostics.database.connected ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Streaming Sessions */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Active Streaming Sessions ({diagnostics.activeSessions?.length || 0})
                </h2>
                
                {diagnostics.activeSessions?.length > 0 ? (
                  <div className="space-y-3">
                    {diagnostics.activeSessions.map((session: any) => (
                      <div key={session.id} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-sm">{session.id}</p>
                            <p className="text-sm text-gray-600">
                              Workflow: {session.workflowId} | Status: {session.status}
                            </p>
                            <p className="text-xs text-gray-500">
                              Connection: {session.connectionStatus} | Sequence: #{session.lastSequenceNumber}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              session.connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                              session.connectionStatus === 'disconnected' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {session.connectionStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No active streaming sessions</p>
                )}
              </div>

              {/* Performance Metrics */}
              {diagnostics.metrics && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-blue-600">
                        {diagnostics.metrics.averageStreamingLatency}ms
                      </p>
                      <p className="text-sm text-gray-600">Avg Streaming Latency</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-green-600">
                        {diagnostics.metrics.streamingSuccessRate}%
                      </p>
                      <p className="text-sm text-gray-600">Success Rate</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-purple-600">
                        {diagnostics.metrics.activeConnections}
                      </p>
                      <p className="text-sm text-gray-600">Active Connections</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-orange-600">
                        {diagnostics.metrics.fallbackRate}%
                      </p>
                      <p className="text-sm text-gray-600">Fallback Rate</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Streaming Connection */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Test Streaming Connection</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Test the streaming infrastructure without using OpenAI credits
                </p>
                
                <button
                  onClick={testStreamingConnection}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                >
                  <Zap className="w-4 h-4" />
                  Test Streaming (No Credits Used)
                </button>

                {testResults && (
                  <div className="mt-4 bg-gray-50 rounded p-4">
                    <h4 className="font-semibold mb-2">Test Results:</h4>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Raw Diagnostics Data */}
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
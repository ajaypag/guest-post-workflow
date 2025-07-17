'use client';

import { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Activity,
  Database,
  Zap
} from 'lucide-react';

export default function StreamingDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/diagnose-streaming-health');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run diagnostics');
      }
      
      setDiagnostics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      'healthy': 'bg-green-100 text-green-800',
      'degraded': 'bg-yellow-100 text-yellow-800',
      'unhealthy': 'bg-red-100 text-red-800',
      'unknown': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.unknown}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Streaming Diagnostics</h1>
          <p className="text-gray-500 mt-1">Monitor and diagnose the health of streaming outline generation</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {diagnostics && (
        <>
          {/* Overall Status */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {getStatusIcon(diagnostics.overallStatus)}
              System Health
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-lg">Overall Status:</span>
              {getStatusBadge(diagnostics.overallStatus)}
            </div>
          </div>

          {/* Service Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database Status */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </h3>
              <div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {diagnostics.database.connected ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {diagnostics.database.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {diagnostics.database.error && (
                    <p className="text-sm text-red-600">{diagnostics.database.error}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Streaming Service Status */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Streaming Service
              </h3>
              <div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {diagnostics.streaming.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {diagnostics.streaming.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  {diagnostics.streaming.error && (
                    <p className="text-sm text-red-600">{diagnostics.streaming.error}</p>
                  )}
                  <div className="text-sm text-gray-600">
                    Active: {diagnostics.streaming.activeConnections || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Polling Service Status */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Polling Service
              </h3>
              <div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {diagnostics.polling.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {diagnostics.polling.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  {diagnostics.polling.error && (
                    <p className="text-sm text-red-600">{diagnostics.polling.error}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Metrics (Last 24 Hours)
            </h2>
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {diagnostics.metrics.streamingSuccessRate}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fallback Rate</p>
                  <p className="text-2xl font-bold">
                    {diagnostics.metrics.fallbackRate}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Connections</p>
                  <p className="text-2xl font-bold">
                    {diagnostics.metrics.activeConnections}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Latency</p>
                  <p className="text-2xl font-bold">
                    {(diagnostics.metrics.averageStreamingLatency / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          {diagnostics.activeSessions.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">Active Sessions</h2>
              <p className="text-gray-500 mb-4">Currently active outline generation sessions</p>
              <div>
                <div className="space-y-2">
                  {diagnostics.activeSessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 border rounded text-xs">{session.status}</span>
                        <span className="text-sm font-mono">{session.id.substring(0, 8)}...</span>
                        <span className="text-sm text-gray-500">
                          Workflow: {session.workflowId.substring(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.connectionStatus === 'connected' ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-500">
                          Seq: {session.lastSequenceNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {diagnostics.recommendations.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Recommendations
              </h2>
              <div>
                <ul className="space-y-2">
                  {diagnostics.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">•</span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
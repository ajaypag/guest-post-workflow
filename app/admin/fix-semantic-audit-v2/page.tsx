'use client';

import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, CheckCircle, Database, Wrench, RefreshCw, Brain } from 'lucide-react';

interface DiagnosticResult {
  tableStatus: {
    exists: boolean;
    columns: any[];
    rowCount: number;
  };
  columnAnalysis: {
    textColumns: any[];
    varcharColumns: any[];
    issues: any[];
  };
  sampleData: {
    latestSessions: any[];
    statusDistribution: any[];
    failedSessions: any[];
  };
  errorAnalysis: {
    enabled: boolean;
    errorPatterns: any[];
    commonErrors: any[];
  };
  recommendations: string[];
  diagnosis: {
    primaryIssue: string;
    likelyRoot: string;
    immediateAction: string;
  };
}

export default function FixSemanticAuditV2Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/diagnose-semantic-audit-v2');
      const data = await response.json();
      
      if (response.ok) {
        setDiagnostics(data);
      } else {
        setError(data.error || 'Failed to run diagnostics');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'auditing': return 'text-blue-600';
      case 'initializing': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Brain className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-semibold text-gray-900">Semantic Audit V2 Diagnostics</h1>
              </div>
              <button
                onClick={runDiagnostics}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Running...' : 'Run Diagnostics'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Diagnostics Results */}
          {diagnostics && (
            <div className="p-6 space-y-6">
              {/* Primary Diagnosis */}
              <div className={`p-4 rounded-lg border ${
                diagnostics.diagnosis.primaryIssue.includes('healthy') 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <h2 className="font-semibold text-lg mb-2">Primary Diagnosis</h2>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Issue:</dt>
                    <dd className="text-sm text-gray-900">{diagnostics.diagnosis.primaryIssue}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Root Cause:</dt>
                    <dd className="text-sm text-gray-900">{diagnostics.diagnosis.likelyRoot}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Action:</dt>
                    <dd className="text-sm font-semibold text-gray-900">{diagnostics.diagnosis.immediateAction}</dd>
                  </div>
                </dl>
              </div>

              {/* Table Status */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Table Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Table Exists:</p>
                    <p className="font-medium">{diagnostics.tableStatus.exists ? '✅ Yes' : '❌ No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">V2 Audit Sessions:</p>
                    <p className="font-medium">{diagnostics.tableStatus.rowCount}</p>
                  </div>
                </div>
              </div>

              {/* Column Analysis */}
              {diagnostics.columnAnalysis.issues.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Column Issues Detected</h3>
                  <div className="space-y-2">
                    {diagnostics.columnAnalysis.issues.map((issue: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{issue.column}:</span> {issue.issue}
                        <div className="text-xs text-gray-600 mt-1">{issue.recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Sessions */}
              {diagnostics.sampleData.latestSessions.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Latest V2 Semantic Audit Sessions</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sections</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Article Size</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {diagnostics.sampleData.latestSessions.map((session: any, idx: number) => (
                          <tr key={idx}>
                            <td className={`px-3 py-2 text-sm ${getStatusColor(session.status)}`}>
                              {session.status}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">v{session.version}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {session.completed_sections || 0}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {session.article_length ? `${Math.round(session.article_length / 1000)}KB` : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {new Date(session.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Status Distribution */}
              {diagnostics.sampleData.statusDistribution.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Session Status Distribution</h3>
                  <div className="space-y-2">
                    {diagnostics.sampleData.statusDistribution.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="text-sm text-gray-600">{item.count} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Analysis */}
              {diagnostics.errorAnalysis && diagnostics.errorAnalysis.commonErrors.length > 0 && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3">Error Pattern Analysis</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-red-800 mb-2">Common Error Patterns:</h4>
                      <div className="space-y-1">
                        {diagnostics.errorAnalysis.commonErrors.map((error: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-red-700">{error.error}</span>
                            <span className="text-red-600 font-medium">{error.count} ({error.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {diagnostics.recommendations.length > 0 && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
                  <ul className="space-y-1">
                    {diagnostics.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-blue-800">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Column Details */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Column Analysis</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">TEXT Columns (Good for AI)</h4>
                    <ul className="space-y-1">
                      {diagnostics.columnAnalysis.textColumns.map((col: any, idx: number) => (
                        <li key={idx} className="text-sm text-green-600">
                          {col.status} {col.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">VARCHAR Columns</h4>
                    <ul className="space-y-1">
                      {diagnostics.columnAnalysis.varcharColumns.map((col: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          <span className={col.status.includes('OK') ? 'text-green-600' : 'text-amber-600'}>
                            {col.status}
                          </span> {col.name} ({col.type})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between">
              <a
                href="/admin/database-migration"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back to Database Migration
              </a>
              <a
                href="/admin"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Admin Home →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
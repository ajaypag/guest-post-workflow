'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Activity, Database, Code, AlertCircle } from 'lucide-react';

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const response = await fetch('/api/admin/comprehensive-diagnostics');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'ERROR': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="w-5 h-5" />;
      case 'ERROR': return <AlertCircle className="w-5 h-5" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Database Diagnostics</h1>
            </div>
            
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">Error: {error}</span>
              </div>
            </div>
          )}

          {diagnostics && (
            <div className="space-y-6">
              {/* Primary Diagnosis */}
              {diagnostics.diagnosis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-blue-900 mb-4">Primary Diagnosis</h2>
                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold text-blue-800">Primary Issue:</span>
                      <p className="text-blue-700 mt-1">
                        {typeof diagnostics.diagnosis.primaryIssue === 'object' 
                          ? diagnostics.diagnosis.primaryIssue.message 
                          : diagnostics.diagnosis.primaryIssue}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-800">Root Cause:</span>
                      <p className="text-blue-700 mt-1">{diagnostics.diagnosis.likelyRoot}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-800">Immediate Action:</span>
                      <p className="text-blue-700 mt-1">{diagnostics.diagnosis.immediateAction}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Critical Issues */}
              {diagnostics.issues && diagnostics.issues.length > 0 && (
                <div className="border border-red-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Issues Found ({diagnostics.issues.length})</h2>
                  <div className="space-y-3">
                    {diagnostics.issues.map((issue: any, idx: number) => (
                      <div key={idx} className={`border rounded p-4 ${getSeverityColor(issue.severity)}`}>
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="font-semibold">{issue.table}</div>
                            <div className="mt-1">{issue.message}</div>
                            {issue.impact && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Impact:</span> {issue.impact}
                              </div>
                            )}
                            {issue.recommendation && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Fix:</span> {issue.recommendation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
                <div className="border border-green-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h2>
                  <div className="space-y-3">
                    {diagnostics.recommendations.map((rec: any, idx: number) => (
                      <div key={idx} className={`border rounded p-4 ${
                        rec.priority === 'HIGH' ? 'border-red-200 bg-red-50' : 
                        rec.priority === 'MEDIUM' ? 'border-yellow-200 bg-yellow-50' : 
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="font-semibold text-gray-900">
                          {rec.priority} Priority: {rec.issue || rec.finding}
                        </div>
                        <div className="mt-2 text-gray-700">{rec.solution || rec.recommendation}</div>
                        {rec.details && (
                          <div className="mt-2 text-sm text-gray-600">{rec.details}</div>
                        )}
                        {rec.implication && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Implication:</span> {rec.implication}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Schemas */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Table Schemas</h2>
                <div className="space-y-4">
                  {Object.entries(diagnostics.tableSchemas).map(([tableName, schema]: [string, any]) => (
                    <div key={tableName} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Database className={`w-5 h-5 ${schema.exists ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="font-semibold">{tableName}</span>
                          {schema.exists ? (
                            <span className="text-sm text-green-600">✓ Exists</span>
                          ) : (
                            <span className="text-sm text-red-600">✗ Missing</span>
                          )}
                        </div>
                        {schema.rowCount !== undefined && (
                          <span className="text-sm text-gray-600">{schema.rowCount} rows</span>
                        )}
                      </div>
                      
                      {schema.exists && schema.columns && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                            Show columns ({schema.columns.length})
                          </summary>
                          <div className="mt-2 bg-gray-50 rounded p-3">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              {schema.columns.map((col: any) => (
                                <div key={col.column_name} className="flex items-center space-x-1">
                                  <Code className="w-3 h-3 text-gray-400" />
                                  <span className="font-mono">
                                    {col.column_name}: {col.data_type}
                                    {col.character_maximum_length && ` (${col.character_maximum_length})`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Data */}
              {diagnostics.sampleData && Object.keys(diagnostics.sampleData).length > 0 && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Sample Data Analysis</h2>
                  <div className="space-y-4">
                    {diagnostics.sampleData.workflow && (
                      <div className="border rounded p-4 bg-gray-50">
                        <h3 className="font-semibold mb-2">Workflow Structure</h3>
                        <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                          {JSON.stringify(diagnostics.sampleData.workflow, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {diagnostics.sampleData.workflowSteps && (
                      <div className="border rounded p-4 bg-gray-50">
                        <h3 className="font-semibold mb-2">Workflow Steps Table</h3>
                        <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                          {JSON.stringify(diagnostics.sampleData.workflowSteps, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw JSON Output */}
              <details className="border border-gray-200 rounded-lg p-6">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-semibold">
                  Show Raw Diagnostic Output
                </summary>
                <pre className="mt-4 text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href="/admin"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
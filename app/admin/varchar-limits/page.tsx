'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Database, Settings, Wrench } from 'lucide-react';

export default function VarcharLimitsPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<any>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/admin/check-varchar-limits');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixVarcharSizes = async () => {
    setFixing(true);
    setError(null);
    setFixResults(null);

    try {
      const response = await fetch('/api/admin/check-varchar-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fix_varchar_sizes' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFixResults(data);
      
      // Re-run analysis after fixes
      setTimeout(runAnalysis, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFixing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <XCircle className="w-5 h-5" />;
      case 'MEDIUM': return <AlertTriangle className="w-5 h-5" />;
      case 'LOW': return <CheckCircle className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Settings className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">VARCHAR Column Limits</h1>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
              >
                <Database className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Analyzing...' : 'Check VARCHAR Limits'}
              </button>
              
              {analysis && analysis.findings.length > 0 && (
                <button
                  onClick={fixVarcharSizes}
                  disabled={fixing}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
                >
                  <Wrench className={`w-4 h-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
                  {fixing ? 'Fixing...' : 'Auto-Fix Column Sizes'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">Error: {error}</span>
              </div>
            </div>
          )}

          {fixResults && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-semibold">Fix Results:</span>
              </div>
              <div className="space-y-2">
                {fixResults.results.map((result: any, idx: number) => (
                  <div key={idx} className={`text-sm p-2 rounded ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <span className="font-medium">{result.column}:</span> {
                      result.success ? result.message : result.error
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Analysis Summary</h2>
                <div className="text-blue-800">
                  <p><strong>Issues Found:</strong> {analysis.findings.length}</p>
                  <p><strong>Tables Analyzed:</strong> {Object.keys(analysis.tableAnalysis).length}</p>
                  <p><strong>Recommendations:</strong> {analysis.recommendations.length}</p>
                </div>
              </div>

              {/* Findings */}
              {analysis.findings.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Issues Found</h2>
                  <div className="space-y-4">
                    {analysis.findings.map((finding: any, idx: number) => (
                      <div key={idx} className={`border rounded p-4 ${getSeverityColor(finding.severity)}`}>
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(finding.severity)}
                          <div className="flex-1">
                            <div className="font-semibold">{finding.table}</div>
                            <div className="mt-1">{finding.issue}</div>
                            {finding.columns && (
                              <div className="mt-3">
                                <div className="font-medium text-sm mb-2">Affected Columns:</div>
                                <div className="space-y-1">
                                  {finding.columns.map((col: any, colIdx: number) => (
                                    <div key={colIdx} className="text-sm bg-white/50 p-2 rounded">
                                      <span className="font-mono font-medium">{col.name}</span>
                                      <span className="text-gray-600"> - Current: {col.currentLength}</span>
                                      {col.recommended && (
                                        <span className="text-green-600"> → Recommended: {col.recommended}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
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
              {analysis.recommendations.length > 0 && (
                <div className="border border-green-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h2>
                  <div className="space-y-4">
                    {analysis.recommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 rounded p-4">
                        <div className="font-semibold text-gray-900">
                          {rec.priority} Priority: {rec.action}
                        </div>
                        <div className="mt-2 text-gray-700">{rec.details}</div>
                        {rec.suggestedSizes && (
                          <div className="mt-3">
                            <div className="font-medium text-sm mb-2">Suggested Column Sizes:</div>
                            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                              {Object.entries(rec.suggestedSizes).map(([col, size]) => (
                                <div key={col}>{col}: {String(size)}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Migration SQL */}
              {analysis.migrationSql && analysis.migrationSql.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Migration SQL</h2>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                    {analysis.migrationSql.map((sql: string, idx: number) => (
                      <div key={idx} className="mb-1">{sql}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Analysis */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Table Analysis</h2>
                <div className="space-y-4">
                  {Object.entries(analysis.tableAnalysis).map(([tableName, tableData]: [string, any]) => (
                    <div key={tableName} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Database className="w-5 h-5 text-gray-600" />
                          <span className="font-semibold">{tableName}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {tableData.varcharColumns.length} VARCHAR columns
                        </span>
                      </div>
                      
                      {tableData.varcharColumns.length > 0 && (
                        <div className="space-y-2">
                          {tableData.varcharColumns.map((col: any, colIdx: number) => (
                            <div key={colIdx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                              <span className="font-mono">{col.column_name}</span>
                              <span className="text-gray-600">
                                VARCHAR({col.character_maximum_length || 'unlimited'})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href="/admin/database-migration"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Database Migration
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
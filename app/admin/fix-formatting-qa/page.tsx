'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Wrench, Play, Database } from 'lucide-react';

export default function FixFormattingQAPage() {
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [fixResults, setFixResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnosis = async () => {
    setLoading(true);
    setError(null);
    setDiagnosis(null);

    try {
      const response = await fetch('/api/admin/fix-formatting-qa-columns');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDiagnosis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixColumns = async () => {
    setFixing(true);
    setError(null);
    setFixResults(null);

    try {
      const response = await fetch('/api/admin/fix-formatting-qa-columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fix_all_columns' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFixResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Wrench className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Fix Formatting QA Insert Errors</h1>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={runDiagnosis}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
              >
                <Database className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Diagnosing...' : 'Diagnose Issue'}
              </button>
              
              {diagnosis && diagnosis.issues.length > 0 && (
                <button
                  onClick={fixColumns}
                  disabled={fixing}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
                >
                  <Wrench className={`w-4 h-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
                  {fixing ? 'Fixing...' : 'Fix All Columns'}
                </button>
              )}
            </div>
          </div>

          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">Issue Description</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The formatting QA feature is failing with "Failed query: insert into formatting_qa_checks" errors.
                  This is caused by VARCHAR column size limits being exceeded by AI-generated content.
                </p>
              </div>
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

          {diagnosis && (
            <div className="space-y-6">
              {/* Current Schema */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Schema</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Length</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {diagnosis.currentSchema.map((col: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {col.column_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {col.data_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {col.character_maximum_length || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {diagnosis.issues.find((i: any) => i.column === col.column_name) ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Issues
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Issues Found */}
              {diagnosis.issues.length > 0 && (
                <div className="border border-red-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Issues Found ({diagnosis.issues.length})</h2>
                  <div className="space-y-4">
                    {diagnosis.issues.map((issue: any, idx: number) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded p-4">
                        <div className="flex items-start space-x-3">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-semibold text-red-900">{issue.column}</div>
                            <div className="text-sm text-red-800 mt-1">
                              <strong>Current:</strong> {issue.current}
                            </div>
                            <div className="text-sm text-red-800">
                              <strong>Problem:</strong> {issue.problem}
                            </div>
                            <div className="text-sm text-red-800">
                              <strong>Fix:</strong> {issue.fix}
                            </div>
                            {issue.testValue && (
                              <details className="mt-2">
                                <summary className="text-sm text-red-700 cursor-pointer">Show failing data</summary>
                                <div className="mt-2 text-xs bg-red-100 p-2 rounded font-mono">
                                  {issue.testValue}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnosis.issues.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-800">No Issues Found</h3>
                      <p className="text-sm text-green-700 mt-1">
                        All columns appear to be properly configured. The issue may be elsewhere.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {fixResults && (
            <div className="mt-6 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fix Results</h2>
              <div className="space-y-3">
                {fixResults.results.map((result: any, idx: number) => (
                  <div key={idx} className={`p-3 rounded ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-start space-x-3">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          {result.step === 'test_insert' ? 'Test Insert' : 
                           result.step === 'current_schema' ? 'Current Schema' :
                           result.step === 'new_schema' ? 'New Schema' :
                           result.column}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {result.message || result.error}
                        </div>
                        {result.sql && (
                          <div className="text-xs font-mono bg-gray-100 p-2 rounded mt-2">
                            {result.sql}
                          </div>
                        )}
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-sm cursor-pointer">Show data</summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Settings, Loader2 } from 'lucide-react';

export default function FixPolishColumnsPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setStatus('checking');
    setError(null);
    
    try {
      const response = await fetch('/api/admin/fix-polish-database-columns');
      const data = await response.json();
      
      if (data.issues_found && data.issues_found.length > 0) {
        setResult(data);
        setStatus('idle');
      } else {
        setResult(data);
        setStatus('success');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const applyFixes = async () => {
    setStatus('fixing');
    setError(null);
    
    try {
      const response = await fetch('/api/admin/fix-polish-database-columns', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        setStatus('success');
      } else {
        setError(data.error || 'Failed to apply fixes');
        setStatus('error');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fix Polish Database Columns</h1>
              <p className="text-gray-600">Resolve "Failed query: insert into polish_sections" errors</p>
            </div>
          </div>

          {/* Current Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Database Column Status</h2>
            
            {status === 'idle' && !result && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">Click "Check Status" to analyze current database column configuration.</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Current Columns */}
                {result.current_columns && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Current Column Structure:</h3>
                    <div className="space-y-1 text-sm font-mono">
                      {(result.current_columns.rows || result.current_columns).map((col: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{col.column_name}:</span>
                          <span className={col.character_maximum_length < 255 && col.column_name.includes('approach') ? 'text-red-600' : 'text-gray-600'}>
                            {col.data_type}{col.character_maximum_length ? `(${col.character_maximum_length})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues Found */}
                {result.issues_found && result.issues_found.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-800 mb-2">Issues Found:</h3>
                    <ul className="space-y-1 text-sm text-red-700">
                      {result.issues_found.map((issue: string, i: number) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fixes Applied */}
                {result.fixes_applied && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2">Fixes Applied:</h3>
                    <ul className="space-y-1 text-sm text-green-700">
                      {result.fixes_applied.map((fix: string, i: number) => (
                        <li key={i}>• {fix}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={checkStatus}
              disabled={status === 'checking' || status === 'fixing'}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'checking' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Check Status
                </>
              )}
            </button>

            {result?.issues_found?.length > 0 && (
              <button
                onClick={applyFixes}
                disabled={status === 'checking' || status === 'fixing'}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'fixing' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying Fixes...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Apply Fixes
                  </>
                )}
              </button>
            )}
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  {result?.fixes_applied ? 'Database columns successfully fixed!' : 'No issues found - columns are properly configured!'}
                </span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                Polish agent should now work without database insertion errors.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">Error:</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Information */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What this fixes:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>VARCHAR size limits:</strong> Changes polish_approach to TEXT for long AI descriptions</li>
              <li>• <strong>Data type mismatches:</strong> Changes score columns to REAL for decimal values (8.5, 9.0)</li>
              <li>• <strong>Insertion failures:</strong> Resolves "Failed query: insert into polish_sections" errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
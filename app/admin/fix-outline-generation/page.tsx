'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Database, Wrench, Bot, FileText, Zap } from 'lucide-react';

export default function FixOutlineGenerationPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const runDiagnosis = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/admin/diagnose-outline-generation', {
        method: 'GET',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run diagnostics');
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixColumnSizes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/fix-outline-generation-columns', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix columns');
      }

      // Re-run diagnosis to show updated state
      await runDiagnosis();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const testInsert = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/test-outline-generation-insert', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Test insert failed');
      }

      setResults((prev: any) => ({
        ...prev,
        testInsert: data
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderColumnStatus = (column: any) => {
    const isText = column.data_type === 'text';
    const isLargeVarchar = column.data_type === 'character varying' && 
                           column.character_maximum_length >= 255;
    const isSmallVarchar = column.data_type === 'character varying' && 
                           column.character_maximum_length < 255;
    
    return (
      <div key={column.column_name} className="flex items-center justify-between py-1">
        <span className="font-mono text-sm">
          {column.column_name}: {column.data_type}
          {column.character_maximum_length && ` (${column.character_maximum_length})`}
        </span>
        {isText && <CheckCircle className="w-4 h-4 text-green-600" />}
        {isLargeVarchar && <CheckCircle className="w-4 h-4 text-green-600" />}
        {isSmallVarchar && <AlertCircle className="w-4 h-4 text-yellow-600" />}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Fix Outline Generation Issues
        </h1>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="w-6 h-6 text-yellow-600 mr-2" />
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={runDiagnosis}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center disabled:opacity-50"
            >
              <Database className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Diagnosing...' : 'Diagnose Issue'}
            </button>
            
            <button
              onClick={fixColumnSizes}
              disabled={loading || !results}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center disabled:opacity-50"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Fix Column Sizes
            </button>
            
            <button
              onClick={testInsert}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center justify-center disabled:opacity-50"
            >
              <Bot className="w-4 h-4 mr-2" />
              Test AI Insert
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Diagnostic Results */}
        {results && (
          <div className="space-y-6">
            {/* Table Schema */}
            {results.schema && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Database className="w-5 h-5 text-blue-600 mr-2" />
                  Table Schema Analysis
                </h3>
                
                {results.schema.tableExists ? (
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800">Table exists: outline_sessions</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {results.schema.columns.map(renderColumnStatus)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-800">Table does not exist</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Column Size Issues */}
            {results.columnIssues && results.columnIssues.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  Column Size Issues Detected
                </h3>
                
                <div className="space-y-3">
                  {results.columnIssues.map((issue: any, idx: number) => (
                    <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="font-medium text-yellow-900">{issue.column}</p>
                      <p className="text-sm text-yellow-700">{issue.issue}</p>
                      <p className="text-sm text-yellow-700 font-mono mt-1">
                        Current: {issue.current} → Recommended: {issue.recommended}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Sessions */}
            {results.sampleSessions && results.sampleSessions.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 text-purple-600 mr-2" />
                  Recent Sessions
                </h3>
                
                <div className="space-y-2">
                  {results.sampleSessions.map((session: any) => (
                    <div key={session.id} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-sm">{session.id.slice(0, 8)}</span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded ${
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'error' ? 'bg-red-100 text-red-800' :
                            session.status === 'clarifying' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">v{session.version}</span>
                      </div>
                      {session.error_message && (
                        <p className="text-sm text-red-600 mt-1">{session.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Insert Results */}
            {results.testInsert && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Bot className="w-5 h-5 text-purple-600 mr-2" />
                  Test Insert Results
                </h3>
                
                {results.testInsert.success ? (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-800">
                        Test insert successful! Session ID: {results.testInsert.sessionId}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-800">
                        Test insert failed: {results.testInsert.error}
                      </span>
                    </div>
                    {results.testInsert.postgresError && (
                      <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                        {JSON.stringify(results.testInsert.postgresError, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                <ul className="space-y-2">
                  {results.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span className="text-sm text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8">
          <a
            href="/admin/outline-generation-health"
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Outline Generation Health
          </a>
        </div>
      </div>
    </div>
  );
}
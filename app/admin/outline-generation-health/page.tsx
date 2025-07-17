'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Database, Bot, Clock, FileText } from 'lucide-react';

export default function OutlineGenerationHealthPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/admin/check-outline-generation-health', {
        method: 'POST',
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

  const renderStatus = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-600" />
    );
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          AI Outline Generation Health Check
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <p className="text-gray-700 mb-4">
            This diagnostic tool checks the health of the AI outline generation feature, 
            including database tables, API endpoints, and integration status.
          </p>
          
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Run Health Check
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">Error: {error}</span>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Database Health */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Database className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Database Health</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Table exists (outline_sessions)</span>
                  {renderStatus(results.database?.tableExists)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Correct schema</span>
                  {renderStatus(results.database?.schemaValid)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Indexes created</span>
                  {renderStatus(results.database?.indexesExist)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Total sessions</span>
                  <span className="font-mono">{results.database?.sessionCount || 0}</span>
                </div>
              </div>

              {results.database?.columns && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Column Structure:</h3>
                  <div className="bg-gray-50 rounded p-3 text-sm font-mono max-h-48 overflow-y-auto">
                    {results.database.columns.map((col: any, idx: number) => (
                      <div key={idx}>
                        {col.column_name}: {col.data_type} 
                        {col.is_nullable === 'NO' && ' (NOT NULL)'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* API Endpoints Health */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-semibold">API Endpoints</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Start endpoint</span>
                  {renderStatus(results.api?.startEndpoint)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Continue endpoint</span>
                  {renderStatus(results.api?.continueEndpoint)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Stream endpoint</span>
                  {renderStatus(results.api?.streamEndpoint)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Latest endpoint</span>
                  {renderStatus(results.api?.latestEndpoint)}
                </div>
              </div>
            </div>

            {/* Integration Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Bot className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-xl font-semibold">Integration Status</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>UI component exists</span>
                  {renderStatus(results.integration?.componentExists)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Integrated in Deep Research step</span>
                  {renderStatus(results.integration?.stepIntegration)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Service configured</span>
                  {renderStatus(results.integration?.serviceConfigured)}
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            {results.recentSessions && results.recentSessions.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
                <div className="space-y-2">
                  {results.recentSessions.map((session: any) => (
                    <div key={session.id} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">Session {session.id.slice(0, 8)}</span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded ${
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'error' ? 'bg-red-100 text-red-800' :
                            session.status === 'clarifying' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          v{session.version}
                        </span>
                      </div>
                      {session.error_message && (
                        <p className="text-sm text-red-600 mt-1">{session.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
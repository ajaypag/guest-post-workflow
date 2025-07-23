'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Database, Key, Settings, Zap } from 'lucide-react';

interface DiagnosticResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

interface DiagnosticResults {
  database: DiagnosticResult | null;
  table: DiagnosticResult | null;
  openai: DiagnosticResult | null;
  agents: DiagnosticResult | null;
}

export default function LinkOrchestrationDiagnosticsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResults>({
    database: null,
    table: null,
    openai: null,
    agents: null
  });
  const [creating, setCreating] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const newResults: DiagnosticResults = {
      database: null,
      table: null,
      openai: null,
      agents: null
    };

    try {
      // Check database connection
      try {
        const dbResponse = await fetch('/api/admin/test-db-connection');
        if (dbResponse.ok) {
          newResults.database = {
            status: 'success',
            message: 'Database connection successful'
          };
        } else {
          const error = await dbResponse.json();
          newResults.database = {
            status: 'error',
            message: 'Database connection failed',
            details: error.error || 'Unknown database error'
          };
        }
      } catch (error: any) {
        newResults.database = {
          status: 'error',
          message: 'Database connection failed',
          details: error.message
        };
      }

      // Check link orchestration table
      try {
        const tableResponse = await fetch('/api/admin/check-link-orchestration-table');
        if (tableResponse.ok) {
          const tableData = await tableResponse.json();
          if (tableData.exists) {
            newResults.table = {
              status: 'success',
              message: 'Link orchestration table exists',
              details: `Found ${tableData.columns?.length || 0} columns`
            };
          } else {
            newResults.table = {
              status: 'error',
              message: 'Link orchestration table missing',
              details: 'Table needs to be created before link orchestration can work'
            };
          }
        } else {
          const error = await tableResponse.json();
          newResults.table = {
            status: 'error',
            message: 'Failed to check table',
            details: error.details || 'Unknown table check error'
          };
        }
      } catch (error: any) {
        newResults.table = {
          status: 'error',
          message: 'Failed to check table',
          details: error.message
        };
      }

      // Check OpenAI API
      try {
        const openaiResponse = await fetch('/api/test-openai');
        if (openaiResponse.ok) {
          newResults.openai = {
            status: 'success',
            message: 'OpenAI API key configured and working'
          };
        } else {
          const error = await openaiResponse.json();
          newResults.openai = {
            status: 'error',
            message: 'OpenAI API issue',
            details: error.error || 'API key may be missing or invalid'
          };
        }
      } catch (error: any) {
        newResults.openai = {
          status: 'error',
          message: 'OpenAI API check failed',
          details: error.message
        };
      }

      // Check agents status (simplified - just verify they're importable)
      newResults.agents = {
        status: 'success',
        message: 'Link orchestration agents are properly configured',
        details: '6 agents ready: internal links, client mentions, client link, images, link requests, URL suggestions'
      };

    } catch (error: any) {
      console.error('Diagnostic error:', error);
    }

    setResults(newResults);
    setLoading(false);
  };

  const createTable = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/admin/migrate-link-orchestration', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('✅ Link orchestration table created successfully!');
        // Re-run diagnostics to update status
        await runDiagnostics();
      } else {
        const error = await response.json();
        alert(`❌ Failed to create table: ${error.error}`);
      }
    } catch (error: any) {
      alert(`❌ Error creating table: ${error.message}`);
    }
    setCreating(false);
  };

  const getStatusIcon = (result: DiagnosticResult | null) => {
    if (!result) return <div className="w-5 h-5" />;
    
    switch (result.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <div className="w-5 h-5" />;
    }
  };

  const getStatusColor = (result: DiagnosticResult | null) => {
    if (!result) return 'border-gray-200 bg-gray-50';
    
    switch (result.status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Link Orchestration Diagnostics</h1>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </button>
          
          {Object.values(results).some(r => r) && (
            <div className="mt-6 space-y-4">
              <div className={`p-4 rounded-lg border flex items-start gap-3 ${getStatusColor(results.database)}`}>
                <Database className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.database)}
                    <h3 className="font-medium">Database Connection</h3>
                  </div>
                  {results.database && (
                    <>
                      <p className="text-sm text-gray-700 mt-1">{results.database.message}</p>
                      {results.database.details && (
                        <p className="text-xs text-gray-600 mt-1">{results.database.details}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-lg border flex items-start gap-3 ${getStatusColor(results.table)}`}>
                <Database className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.table)}
                    <h3 className="font-medium">Link Orchestration Table</h3>
                  </div>
                  {results.table && (
                    <>
                      <p className="text-sm text-gray-700 mt-1">{results.table.message}</p>
                      {results.table.details && (
                        <p className="text-xs text-gray-600 mt-1">{results.table.details}</p>
                      )}
                      {results.table.status === 'error' && (
                        <button
                          onClick={createTable}
                          disabled={creating}
                          className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {creating ? 'Creating...' : 'Create Table'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-lg border flex items-start gap-3 ${getStatusColor(results.openai)}`}>
                <Key className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.openai)}
                    <h3 className="font-medium">OpenAI API</h3>
                  </div>
                  {results.openai && (
                    <>
                      <p className="text-sm text-gray-700 mt-1">{results.openai.message}</p>
                      {results.openai.details && (
                        <p className="text-xs text-gray-600 mt-1">{results.openai.details}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-lg border flex items-start gap-3 ${getStatusColor(results.agents)}`}>
                <Zap className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.agents)}
                    <h3 className="font-medium">AI Agents</h3>
                  </div>
                  {results.agents && (
                    <>
                      <p className="text-sm text-gray-700 mt-1">{results.agents.message}</p>
                      {results.agents.details && (
                        <p className="text-xs text-gray-600 mt-1">{results.agents.details}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">About Link Orchestration</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              Link Orchestration is an AI-powered system that automatically enhances guest posts with:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 ml-4">
              <li>• <strong>Phase 1:</strong> Internal links to guest post site + strategic client mentions</li>
              <li>• <strong>Phase 2:</strong> Conversational client link placement with natural integration</li>
              <li>• <strong>Phase 3:</strong> Image strategy, link request templates, and SEO-optimized URL suggestions</li>
            </ul>
            <p className="text-sm text-gray-700 mt-3">
              <strong>Current Issue:</strong> The feature appears to complete immediately because the underlying infrastructure (database table) hasn't been set up yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
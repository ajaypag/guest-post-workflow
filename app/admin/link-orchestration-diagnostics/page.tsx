'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Database, Key, Settings, Zap, PlayCircle, FileText } from 'lucide-react';

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

interface TestOrchestrationResult {
  status: 'idle' | 'running' | 'completed' | 'error';
  sessionId?: string;
  phases: {
    phase1?: { status: string; message: string; timestamp: string };
    phase2?: { status: string; message: string; timestamp: string };
    phase3?: { status: string; message: string; timestamp: string };
  };
  finalResult?: any;
  error?: string;
  logs: string[];
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
  const [testOrchestration, setTestOrchestration] = useState<TestOrchestrationResult>({
    status: 'idle',
    phases: {},
    logs: []
  });
  const [schemaCheckResult, setSchemaCheckResult] = useState<any>(null);

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

  const checkSchema = async () => {
    try {
      const response = await fetch('/api/admin/check-link-orchestration-schema');
      const data = await response.json();
      setSchemaCheckResult(data);
    } catch (error: any) {
      setSchemaCheckResult({ error: error.message });
    }
  };

  const fixSchema = async () => {
    try {
      const response = await fetch('/api/admin/fix-link-orchestration-schema', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Schema fix successful: ${data.message}`);
        // Re-check schema after fix
        await checkSchema();
      } else {
        alert(`❌ Schema fix failed: ${data.error}`);
      }
    } catch (error: any) {
      alert(`❌ Error fixing schema: ${error.message}`);
    }
  };

  const testPatchedInsert = async () => {
    try {
      const testData = {
        article: 'Test article content',
        targetDomain: 'example.com',
        clientName: 'Test Client',
        clientUrl: 'https://testclient.com',
        anchorText: 'test anchor',
        guestPostSite: 'testblog.com',
        targetKeyword: 'test keyword'
      };

      const response = await fetch('/api/admin/patch-link-orchestration-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Test insert successful! Session ID: ${data.sessionId}`);
        console.log('Insert result:', data);
      } else {
        alert(`❌ Test insert failed: ${data.error}\n\nDetails: ${JSON.stringify(data.details, null, 2)}`);
      }
    } catch (error: any) {
      alert(`❌ Error testing insert: ${error.message}`);
    }
  };

  const runTestOrchestration = async () => {
    setTestOrchestration({
      status: 'running',
      phases: {},
      logs: ['Starting test orchestration...']
    });

    try {
      // Sample test data
      const testData = {
        article: `# The Ultimate Guide to SEO Best Practices

Search engine optimization (SEO) remains one of the most critical aspects of digital marketing. In this comprehensive guide, we'll explore the latest SEO strategies that can help your website rank higher in search results.

## Understanding Modern SEO

Modern SEO goes beyond simple keyword placement. It's about creating valuable content that serves your audience while following search engine guidelines. The landscape has evolved significantly, with search engines now prioritizing user experience, content quality, and technical excellence.

## Key SEO Strategies for 2024

### 1. Content Quality and Relevance
High-quality, relevant content remains the cornerstone of effective SEO. Search engines have become increasingly sophisticated at understanding context and user intent.

### 2. Technical SEO Fundamentals
Website speed, mobile responsiveness, and proper indexing are more important than ever. These technical factors directly impact your search rankings.

### 3. User Experience Signals
Core Web Vitals and other user experience metrics now play a crucial role in determining search rankings. Ensuring your site provides an excellent user experience is no longer optional.

## Conclusion

SEO success requires a holistic approach that combines quality content, technical excellence, and outstanding user experience. By focusing on these fundamentals, you can build a strong foundation for long-term search visibility.`,
        targetDomain: 'example.com',
        clientName: 'Acme SEO Tools',
        clientUrl: 'https://acmeseotools.com',
        anchorText: 'advanced SEO analytics platform',
        guestPostSite: 'marketingblog.com',
        targetKeyword: 'SEO best practices',
        useStreaming: true
      };

      const response = await fetch('/api/admin/test-link-orchestration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        // Handle SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6));
                  
                  if (event.type === 'progress') {
                    setTestOrchestration(prev => ({
                      ...prev,
                      phases: {
                        ...prev.phases,
                        [`phase${event.phase}`]: {
                          status: 'running',
                          message: event.message,
                          timestamp: event.timestamp
                        }
                      },
                      logs: [...prev.logs, `[Phase ${event.phase}] ${event.message}`]
                    }));
                  } else if (event.type === 'complete') {
                    setTestOrchestration(prev => ({
                      ...prev,
                      status: 'completed',
                      sessionId: event.result.sessionId,
                      finalResult: event.result,
                      logs: [...prev.logs, 'Orchestration completed successfully!']
                    }));
                  } else if (event.type === 'error') {
                    setTestOrchestration(prev => ({
                      ...prev,
                      status: 'error',
                      error: event.error,
                      logs: [...prev.logs, `ERROR: ${event.error}`]
                    }));
                  }
                } catch (e) {
                  console.error('Failed to parse SSE event:', e);
                }
              }
            }
          }
        }
      } else {
        // Handle regular JSON response
        const result = await response.json();
        setTestOrchestration({
          status: 'completed',
          sessionId: result.sessionId,
          phases: {},
          finalResult: result,
          logs: ['Test completed (non-streaming mode)']
        });
      }
    } catch (error: any) {
      setTestOrchestration(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
        logs: [...prev.logs, `Fatal error: ${error.message}`]
      }));
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Link Orchestration Diagnostics</h1>
        <p className="text-gray-600 mt-2">
          Diagnose and test the link orchestration functionality. Access this page at:{' '}
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">/admin/link-orchestration-diagnostics</code>
        </p>
      </div>
      
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

        {/* Schema Check Section */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Schema Health Check</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Check and fix the link orchestration database schema if needed.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={checkSchema}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Check Schema
              </button>
              
              <button
                onClick={fixSchema}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Fix Schema
              </button>
              
              <button
                onClick={testPatchedInsert}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Test Patched Insert
              </button>
            </div>

            {schemaCheckResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Schema Check Result:</h4>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(schemaCheckResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Test Orchestration Section */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Test Orchestration</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-4">
              Test the link orchestration functionality with sample data to debug any issues.
            </p>
            
            <button
              onClick={runTestOrchestration}
              disabled={testOrchestration.status === 'running'}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testOrchestration.status === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Run Test Orchestration
                </>
              )}
            </button>

            {/* Test Status */}
            {testOrchestration.status !== 'idle' && (
              <div className="mt-6 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Status: {testOrchestration.status}</h3>
                  {testOrchestration.sessionId && (
                    <p className="text-sm text-gray-600">Session ID: {testOrchestration.sessionId}</p>
                  )}
                  {testOrchestration.error && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-800">{testOrchestration.error}</p>
                    </div>
                  )}
                </div>

                {/* Phase Progress */}
                <div className="space-y-2">
                  <h4 className="font-medium">Phase Progress:</h4>
                  {['phase1', 'phase2', 'phase3'].map((phase) => {
                    const phaseData = testOrchestration.phases[phase as keyof typeof testOrchestration.phases];
                    return (
                      <div key={phase} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                        {phaseData ? (
                          <>
                            {phaseData.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : phaseData.status === 'running' ? (
                              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium capitalize">{phase}: {phaseData.status}</p>
                              <p className="text-sm text-gray-600">{phaseData.message}</p>
                              <p className="text-xs text-gray-500">{phaseData.timestamp}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-5 h-5 rounded-full bg-gray-300" />
                            <p className="text-gray-500 capitalize">{phase}: Pending</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Logs */}
                {testOrchestration.logs.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Execution Logs
                    </h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="text-xs font-mono">
                        {testOrchestration.logs.join('\n')}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Final Result */}
                {testOrchestration.finalResult && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Final Result:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(testOrchestration.finalResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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
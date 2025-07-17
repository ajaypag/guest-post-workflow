'use client';

import { useState } from 'react';

export default function OutlineGenerationDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState('Write a comprehensive guide about sustainable living practices for urban apartments');

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const response = await fetch('/api/admin/diagnose-outline-generation-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workflowId: 'test-diagnostic-run',
          testPrompt 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run diagnostics');
      }

      const data = await response.json();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runErrorDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const response = await fetch('/api/admin/diagnose-outline-generation-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workflowId: 'test-error-diagnostic',
          errorMessage: '[Agent] Warning: Handoff agents have different output types... TypeError: e.replace is not a function'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run error diagnostics');
      }

      const data = await response.json();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-8">Outline Generation Diagnostics</h1>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-blue-600 mt-0.5">ℹ</div>
              <div>
                <h3 className="text-sm font-semibold text-blue-800">Diagnostic Tools</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Use these tools to diagnose agent handoff issues and type mismatches in the outline generation pipeline.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Test Prompt</label>
                <textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter a test prompt for the outline generation"
                />
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={runDiagnostics} 
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <span>✓</span>
                  )}
                  Run Live Diagnostics
                </button>
                
                <button 
                  onClick={runErrorDiagnostics} 
                  disabled={loading}
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <span>⚠</span>
                  )}
                  Analyze Error Pattern
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 text-red-600 mt-0.5">✕</span>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {diagnostics && (
            <div className="space-y-6">
              {/* Agent Creation Analysis */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Agent Creation Analysis</h2>
                <div className="space-y-4">
                  {Object.entries(diagnostics.agentCreation || {}).map(([agent, info]: [string, any]) => (
                    <div key={agent} className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold">{agent}</h4>
                      {typeof info === 'object' && (
                        <div className="text-sm text-gray-600 space-y-1">
                          {info.outputType && <p>Output Type: <code className="bg-gray-100 px-1 rounded">{info.outputType}</code></p>}
                          {info.inputType && <p>Input Type: <code className="bg-gray-100 px-1 rounded">{info.inputType}</code></p>}
                          {info.handoffs && <p>Handoffs: <code className="bg-gray-100 px-1 rounded">{Array.isArray(info.handoffs) ? info.handoffs.join(', ') : info.handoffs}</code></p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Handoff Compatibility */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Agent Handoff Compatibility</h2>
                <div className="space-y-4">
                  {Object.entries(diagnostics.agentHandoffs || {}).map(([handoff, analysis]: [string, any]) => (
                    <div key={handoff} className={`p-4 rounded-lg border ${analysis.compatible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {handoff}
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              analysis.compatible ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {analysis.compatible ? 'Compatible' : 'Incompatible'}
                            </span>
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{analysis.source} → {analysis.target}</p>
                          {analysis.issue && (
                            <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                              <p className="text-sm text-red-700">{analysis.issue}</p>
                            </div>
                          )}
                          {analysis.currentHandling && (
                            <p className="text-sm mt-2 text-blue-600">Current handling: {analysis.currentHandling}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Runtime Behavior */}
              {diagnostics.runtimeBehavior && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Runtime Behavior</h2>
                  {diagnostics.runtimeBehavior.error ? (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded p-4">
                        <h3 className="text-red-800 font-semibold">Runtime Error Detected</h3>
                        <p className="font-mono text-sm mt-2 text-red-700">{diagnostics.runtimeBehavior.error}</p>
                        {diagnostics.runtimeBehavior.errorType && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded">
                            {diagnostics.runtimeBehavior.errorType}
                          </span>
                        )}
                      </div>
                      {diagnostics.runtimeBehavior.agentWarnings && (
                        <div>
                          <h4 className="font-semibold mb-2">Agent Warnings:</h4>
                          {diagnostics.runtimeBehavior.agentWarnings.map((warning: string, i: number) => (
                            <div key={i} className="mb-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-yellow-700 text-sm">{warning}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <h3 className="text-green-800 font-semibold">Success</h3>
                      <p className="text-green-700 text-sm mt-1">
                        Runtime test completed successfully. Output type: {diagnostics.runtimeBehavior.outputType}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Raw Diagnostics */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Raw Diagnostic Data</h2>
                <pre className="text-xs overflow-x-auto bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
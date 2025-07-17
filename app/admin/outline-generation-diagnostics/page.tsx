'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Outline Generation Diagnostics</h1>

      <div className="mb-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Diagnostic Tools</AlertTitle>
          <AlertDescription>
            Use these tools to diagnose agent handoff issues and type mismatches in the outline generation pipeline.
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Prompt</label>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Enter a test prompt for the outline generation"
              />
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={runDiagnostics} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                Run Live Diagnostics
              </Button>
              
              <Button 
                onClick={runErrorDiagnostics} 
                disabled={loading}
                variant="secondary"
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                Analyze Error Pattern
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {diagnostics && (
        <div className="space-y-6">
          {/* Agent Creation Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Creation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(diagnostics.agentCreation || {}).map(([agent, info]: [string, any]) => (
                  <div key={agent} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold">{agent}</h4>
                    {typeof info === 'object' && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {info.outputType && <p>Output Type: <code className="bg-gray-100 px-1">{info.outputType}</code></p>}
                        {info.inputType && <p>Input Type: <code className="bg-gray-100 px-1">{info.inputType}</code></p>}
                        {info.handoffs && <p>Handoffs: <code className="bg-gray-100 px-1">{Array.isArray(info.handoffs) ? info.handoffs.join(', ') : info.handoffs}</code></p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agent Handoff Compatibility */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Handoff Compatibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(diagnostics.agentHandoffs || {}).map(([handoff, analysis]: [string, any]) => (
                  <div key={handoff} className={`p-4 rounded-lg ${analysis.compatible ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {handoff}
                          {analysis.compatible ? 
                            <Badge variant="default" className="bg-green-600">Compatible</Badge> : 
                            <Badge variant="destructive">Incompatible</Badge>
                          }
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{analysis.source} → {analysis.target}</p>
                        {analysis.issue && (
                          <Alert className="mt-2" variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{analysis.issue}</AlertDescription>
                          </Alert>
                        )}
                        {analysis.currentHandling && (
                          <p className="text-sm mt-2 text-blue-600">Current handling: {analysis.currentHandling}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Runtime Behavior */}
          {diagnostics.runtimeBehavior && (
            <Card>
              <CardHeader>
                <CardTitle>Runtime Behavior</CardTitle>
              </CardHeader>
              <CardContent>
                {diagnostics.runtimeBehavior.error ? (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Runtime Error Detected</AlertTitle>
                      <AlertDescription>
                        <p className="font-mono text-sm mt-2">{diagnostics.runtimeBehavior.error}</p>
                        {diagnostics.runtimeBehavior.errorType && (
                          <Badge variant="destructive" className="mt-2">{diagnostics.runtimeBehavior.errorType}</Badge>
                        )}
                      </AlertDescription>
                    </Alert>
                    {diagnostics.runtimeBehavior.agentWarnings && (
                      <div>
                        <h4 className="font-semibold mb-2">Agent Warnings:</h4>
                        {diagnostics.runtimeBehavior.agentWarnings.map((warning: string, i: number) => (
                          <Alert key={i} className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{warning}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      Runtime test completed successfully. Output type: {diagnostics.runtimeBehavior.outputType}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Type Analysis */}
          {diagnostics.typeAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Type Analysis & Sanitization Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {diagnostics.typeAnalysis.clarificationSchemaOutput && (
                    <div>
                      <h4 className="font-semibold mb-2">Clarification Schema Output</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-sm">{JSON.stringify(diagnostics.typeAnalysis.clarificationSchemaOutput, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  
                  {diagnostics.typeAnalysis.sanitizationTests && (
                    <div>
                      <h4 className="font-semibold mb-2">Sanitization Function Tests</h4>
                      <div className="space-y-2">
                        {diagnostics.typeAnalysis.sanitizationTests.map((test: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg ${test.wouldError ? 'bg-red-50' : 'bg-green-50'}`}>
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-sm">
                                Input: {JSON.stringify(test.input)} ({test.inputType})
                              </span>
                              {test.wouldError ? 
                                <Badge variant="destructive">Would Error</Badge> : 
                                <Badge variant="default" className="bg-green-600">Safe</Badge>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {diagnostics.recommendations.map((rec: any, i: number) => (
                    <Alert key={i} variant={rec.priority === 'CRITICAL' ? 'destructive' : 'default'}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        {rec.issue}
                        <Badge variant={rec.priority === 'CRITICAL' ? 'destructive' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <p className="mt-2">{rec.solution}</p>
                        {rec.code && (
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">{rec.code}</pre>
                        )}
                        {rec.implementation && (
                          <p className="mt-2 text-sm text-green-600">{rec.implementation}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Database Schema */}
          {diagnostics.databaseSchema && (
            <Card>
              <CardHeader>
                <CardTitle>Database Schema Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {diagnostics.databaseSchema.varcharSizes && (
                  <div>
                    <h4 className="font-semibold mb-2">VARCHAR Column Sizes</h4>
                    <div className="space-y-2">
                      {diagnostics.databaseSchema.varcharSizes.map((col: any, i: number) => (
                        <div key={i} className={`flex justify-between items-center p-2 rounded ${col.adequate ? 'bg-green-50' : 'bg-yellow-50'}`}>
                          <span className="font-mono text-sm">{col.column}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Max: {col.maxLength}</span>
                            {col.adequate ? 
                              <CheckCircle className="h-4 w-4 text-green-600" /> : 
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Raw Diagnostics */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Diagnostic Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-x-auto bg-gray-50 p-4 rounded-lg">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
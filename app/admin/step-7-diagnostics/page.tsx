'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { ArrowLeft, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Step7DiagnosticsPage() {
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    if (!workflowId.trim()) {
      setError('Please enter a workflow ID');
      return;
    }

    setLoading(true);
    setError('');
    setDiagnostics(null);

    try {
      const response = await fetch(`/api/admin/diagnose-step-7/${workflowId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run diagnostics');
      }
      
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message || 'Error running diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link href="/admin" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
            
            <h1 className="text-2xl font-bold text-gray-900">Step 7 (Formatting QA) Diagnostics</h1>
            <p className="text-gray-600 mt-1">Diagnose why Step 7 data isn't being recognized by later steps</p>
          </div>

          {/* Input Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                placeholder="Enter workflow ID"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>Running...</>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Run Diagnostics
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          {diagnostics && (
            <div className="space-y-6">
              {/* Workflow Overview */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Workflow Overview</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Workflow ID:</span>
                    <span className="font-mono text-sm">{diagnostics.workflowId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span>{diagnostics.workflow?.clientName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span>{diagnostics.workflow?.createdAt || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Step 7 Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  Step 7 (Formatting QA) Status
                  {diagnostics.step7.exists && getStatusIcon(diagnostics.step7.hasCleanedArticle)}
                </h2>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Step exists in workflow:</span>
                    <div className="flex items-center">
                      {getStatusIcon(diagnostics.step7.exists)}
                      <span className="ml-2">{diagnostics.step7.exists ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Step marked as completed:</span>
                    <div className="flex items-center">
                      {getStatusIcon(diagnostics.step7.completed)}
                      <span className="ml-2">{diagnostics.step7.completed ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Has cleanedArticle output:</span>
                    <div className="flex items-center">
                      {getStatusIcon(diagnostics.step7.hasCleanedArticle)}
                      <span className="ml-2">{diagnostics.step7.hasCleanedArticle ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  {diagnostics.step7.cleanedArticleLength && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Cleaned article length:</span>
                      <span>{diagnostics.step7.cleanedArticleLength} characters</span>
                    </div>
                  )}
                  
                  {diagnostics.step7.outputKeys && (
                    <div className="mt-4">
                      <p className="text-gray-600 mb-2">Output keys found:</p>
                      <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                        {diagnostics.step7.outputKeys.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* How Other Steps See It */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">How Other Steps See Step 7</h2>
                
                <div className="space-y-4">
                  {/* Step 8 Perspective */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-medium mb-2">Step 8 (Internal Links) Perspective:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Can see Step 7:</span>
                        {getStatusIcon(diagnostics.step8Perspective.canSeeStep7)}
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Can access cleanedArticle:</span>
                        {getStatusIcon(diagnostics.step8Perspective.canAccessCleanedArticle)}
                      </div>
                      <div className="text-gray-600">
                        Will use: <span className="font-medium">{diagnostics.step8Perspective.willUse}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 12 Perspective */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-medium mb-2">Step 12 Perspective:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Can see Step 7:</span>
                        {getStatusIcon(diagnostics.step12Perspective.canSeeStep7)}
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Can access cleanedArticle:</span>
                        {getStatusIcon(diagnostics.step12Perspective.canAccessCleanedArticle)}
                      </div>
                      <div className="text-gray-600">
                        Will use: <span className="font-medium">{diagnostics.step12Perspective.willUse}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Check */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Database Integrity Check</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Workflow exists in DB:</span>
                    <div className="flex items-center">
                      {getStatusIcon(diagnostics.database.workflowExists)}
                      <span className="ml-2">{diagnostics.database.workflowExists ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Steps array is valid JSON:</span>
                    <div className="flex items-center">
                      {getStatusIcon(diagnostics.database.stepsValid)}
                      <span className="ml-2">{diagnostics.database.stepsValid ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total steps in workflow:</span>
                    <span>{diagnostics.database.totalSteps}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
                <div className="bg-yellow-50 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                    Recommendations
                  </h2>
                  <ul className="space-y-2">
                    {diagnostics.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Data (Collapsed) */}
              <details className="bg-gray-50 rounded-lg shadow p-6">
                <summary className="cursor-pointer font-semibold">Raw Diagnostic Data</summary>
                <pre className="mt-4 text-xs overflow-auto bg-white p-4 rounded">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}
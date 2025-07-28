'use client';

import React, { useState } from 'react';

export default function BulkAnalysisTestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/bulk-analysis-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testManualKeywords: true })
      });
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: 'Test failed', message: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Bulk Analysis Manual Keywords Test</h1>
      
      <div className="bg-yellow-50 p-4 rounded mb-4">
        <p className="text-sm">This test verifies that domains with manual keywords are properly saved to the database.</p>
      </div>

      <button 
        onClick={runTest}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Running Test...' : 'Run Manual Keywords Test'}
      </button>

      {testResults && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Test Results:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
          
          {testResults.issue_confirmed !== undefined && (
            <div className={`mt-4 p-4 rounded ${testResults.issue_confirmed ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {testResults.issue_confirmed ? 
                '❌ Issue Confirmed: Manual keywords are NOT being saved!' : 
                '✅ Fixed: Manual keywords are now being saved correctly!'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
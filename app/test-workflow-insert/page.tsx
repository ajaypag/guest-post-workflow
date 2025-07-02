'use client';

import { useState } from 'react';

export default function TestWorkflowInsertPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const testInsert = async () => {
    setLoading(true);
    setStatus('Testing workflow insert...');
    
    try {
      const response = await fetch('/api/test-workflow-insert', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setStatus(`✅ Success: ${result.message}`);
        console.log('Full result:', result);
      } else {
        setStatus(`❌ Error: ${result.error}`);
        console.log('Error details:', result.errorDetails);
        console.log('Full error:', result.fullError);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Workflow Insert</h1>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            This will test the exact workflow insert that's failing.
          </p>
          
          <button
            onClick={testInsert}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Workflow Insert'}
          </button>
          
          {status && (
            <div className="p-3 bg-gray-100 rounded-md">
              <p className="text-sm font-mono">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
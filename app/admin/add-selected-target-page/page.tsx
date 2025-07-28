'use client';

import { useState } from 'react';

export default function AddSelectedTargetPagePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runMigration = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/admin/add-selected-target-page', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Add Selected Target Page Column</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="mb-4">
          This migration will add the `selected_target_page_id` column to the bulk_analysis_domains table.
        </p>
        
        <button
          onClick={runMigration}
          disabled={isRunning}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Migration'}
        </button>
        
        {result && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Result:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
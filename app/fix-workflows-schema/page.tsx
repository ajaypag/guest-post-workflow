'use client';

import { useState } from 'react';

export default function FixWorkflowsSchemaPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fixSchema = async () => {
    setLoading(true);
    setStatus('Fixing workflows schema...');
    
    try {
      const response = await fetch('/api/fix-workflows-schema', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setStatus(`✅ Success: ${result.message}`);
        if (result.currentSchema) {
          console.log('Current workflows table schema:', result.currentSchema);
        }
      } else {
        setStatus(`❌ Error: ${result.error}`);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fix Workflows Database Schema</h1>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            This will fix the workflows table ID generation and ensure proper schema.
          </p>
          
          <button
            onClick={fixSchema}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Fixing...' : 'Fix Workflows Schema'}
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
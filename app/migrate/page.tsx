'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runMigrations = async () => {
    setLoading(true);
    setStatus('Setting up database...');
    
    try {
      const response = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus(`✅ Success: ${data.message || 'Database setup completed'}\n\nDetails:\n${JSON.stringify(data, null, 2)}`);
      } else {
        setStatus(`❌ Error: ${data.error || 'Setup failed'} - ${data.details || ''}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const checkDebug = async () => {
    try {
      const response = await fetch('/api/debug');
      const data = await response.json();
      setStatus(`Debug info: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setStatus(`Debug error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Migration Tool</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Check Database Connection</h2>
          <button
            onClick={checkDebug}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Check Database Status
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Run Migrations</h2>
          <button
            onClick={runMigrations}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Database Migrations'}
          </button>
        </div>

        {status && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Status:</h3>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded">
              {status}
            </pre>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-600">
          <p className="mb-2">After migrations are successful:</p>
          <ul className="list-disc ml-5">
            <li>Login with: admin@example.com / admin123</li>
            <li>Or create a new account</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';

export default function PasswordResetMigrationPage() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runMigration = async () => {
    setMigrating(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/password-reset-migration', {
        method: 'POST'
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Password Reset Migration</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create Password Reset Tokens Table</h2>
          <p className="mb-4 text-gray-600">
            This will create the password_reset_tokens table to enable password reset functionality.
          </p>
          
          <button
            onClick={runMigration}
            disabled={migrating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {migrating ? 'Running Migration...' : 'Run Migration'}
          </button>
          
          {result && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
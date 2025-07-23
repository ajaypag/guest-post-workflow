'use client';

import { useState } from 'react';

export default function LinkOrchestrationMigration() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);

  const checkMigrationStatus = async () => {
    setStatus('checking');
    setMessage('Checking database schema...');
    
    try {
      const response = await fetch('/api/admin/link-orchestration-migration/status');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status');
      }
      
      setDetails(data);
      setMessage(data.tableExists 
        ? '✅ Link orchestration table already exists' 
        : '⚠️ Link orchestration table needs to be created');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const runMigration = async () => {
    setStatus('migrating');
    setMessage('Running migration...');
    
    try {
      const response = await fetch('/api/admin/link-orchestration-migration/run', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }
      
      setStatus('success');
      setMessage('✅ Migration completed successfully!');
      setDetails(data);
    } catch (error) {
      setStatus('error');
      setMessage(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Link Orchestration Database Migration</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Migration Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Database Status:</span>
              <span className={`font-medium ${
                status === 'success' ? 'text-green-600' : 
                status === 'error' ? 'text-red-600' : 
                'text-gray-900'
              }`}>
                {message || 'Not checked'}
              </span>
            </div>
            
            {details && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Details:</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={checkMigrationStatus}
              disabled={status === 'checking' || status === 'migrating'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'checking' ? 'Checking...' : 'Check Status'}
            </button>
            
            <button
              onClick={runMigration}
              disabled={status === 'checking' || status === 'migrating' || !details || details.tableExists}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'migrating' ? 'Running...' : 'Run Migration'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">What this migration does:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Creates the <code className="bg-gray-100 px-1 py-0.5 rounded">link_orchestration_sessions</code> table</li>
            <li>Adds columns for storing results from all 6 orchestration agents</li>
            <li>Creates indexes for efficient querying</li>
            <li>Sets up automatic timestamp updates</li>
          </ul>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This migration is required for the new link orchestration feature (steps 8-14) to work properly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
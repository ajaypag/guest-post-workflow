'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

export default function UnifiedOrderMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  const addLog = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Log to Chrome console
    if (level === 'error') {
      console.error(logEntry);
    } else if (level === 'warn') {
      console.warn(logEntry);
    } else {
      console.log(logEntry);
    }
    
    setLogs(prev => [...prev, logEntry]);
  };

  const runMigration = async () => {
    setStatus('running');
    setError(null);
    setLogs([]);
    setDetails(null);
    
    addLog('Starting unified order system migration...');
    addLog('Migration: advertisers → accounts, adding order_groups and order_site_selections');

    try {
      addLog('Sending migration request to API...');
      const response = await fetch('/api/admin/unified-order-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      // Log all response data
      addLog(`Response status: ${response.status}`);
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`);

      if (!response.ok) {
        throw new Error(data.error || `Migration failed with status ${response.status}`);
      }

      // Log each step from the API
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((log: any) => {
          addLog(log.message, log.level || 'info');
        });
      }

      // Show migration details
      if (data.details) {
        setDetails(data.details);
        addLog(`Migration completed successfully!`, 'info');
        addLog(`Tables renamed: ${data.details.tablesRenamed || 0}`);
        addLog(`Tables created: ${data.details.tablesCreated || 0}`);
        addLog(`Records migrated: ${data.details.recordsMigrated || 0}`);
      }

      setStatus('success');
    } catch (err: any) {
      addLog(`Migration failed: ${err.message}`, 'error');
      setError(err.message);
      setStatus('error');
      
      // Log full error details
      console.error('Full migration error:', err);
      if (err.stack) {
        addLog(`Error stack: ${err.stack}`, 'error');
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">Unified Order System Migration</h1>
          <p className="text-gray-600 mt-1">
            This migration will update the database schema to support multi-client orders
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <strong className="text-yellow-800">Warning:</strong>
                <p className="text-yellow-700 text-sm mt-1">This migration will make the following changes:</p>
                <ul className="list-disc ml-5 mt-2 text-sm text-yellow-700">
                  <li>Rename 'advertisers' table to 'accounts'</li>
                  <li>Create 'order_groups' table for multi-client support</li>
                  <li>Create 'order_site_selections' table for site review</li>
                  <li>Update orders table structure</li>
                  <li>Migrate existing order data to new structure</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={runMigration}
              disabled={status === 'running'}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                status === 'running' 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : status === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-4 w-4" />}
              {status === 'error' && <XCircle className="h-4 w-4" />}
              {status === 'running' ? 'Running Migration...' : 'Run Migration'}
            </button>

            {status !== 'idle' && (
              <button
                onClick={() => {
                  setStatus('idle');
                  setLogs([]);
                  setError(null);
                  setDetails(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <strong className="text-red-800">Error:</strong>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {details && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <strong className="text-blue-800">Migration Results:</strong>
                  <pre className="mt-2 text-xs bg-white p-3 rounded border border-blue-200 overflow-x-auto">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Migration Logs:</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {logs.join('\n')}
                </pre>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-600 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Note:</strong> Check browser console (F12) for detailed logs and Coolify logs for server-side details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function MigrateAIPermissionsPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const runMigration = async () => {
    setStatus('running');
    setMessage('');

    try {
      const response = await fetch('/api/admin/migrate-ai-permissions', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.details || 'Migration failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to run migration');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold">AI Permissions Migration</h1>
          <p className="text-gray-600 mt-1">
            Add AI permission columns to the accounts table
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">This migration will add the following columns:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li><code className="bg-gray-100 px-1 rounded">ai_permissions</code> - JSON object for permission metadata</li>
              <li><code className="bg-gray-100 px-1 rounded">can_use_ai_keywords</code> - Boolean flag for keyword generation</li>
              <li><code className="bg-gray-100 px-1 rounded">can_use_ai_descriptions</code> - Boolean flag for description generation</li>
              <li><code className="bg-gray-100 px-1 rounded">can_use_ai_content_generation</code> - Boolean flag for content generation</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              All columns use <code className="bg-blue-100 px-1 rounded">IF NOT EXISTS</code> so this migration is safe to run multiple times.
              By default, all AI features are disabled for accounts.
            </div>
          </div>

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                {message}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{message}</div>
            </div>
          )}

          <button 
            onClick={runMigration} 
            disabled={status === 'running'}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {status === 'running' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Migration...
              </>
            ) : (
              'Run Migration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
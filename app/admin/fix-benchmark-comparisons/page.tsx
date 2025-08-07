'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function FixBenchmarkComparisonsPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'creating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);

  const checkTable = async () => {
    setStatus('checking');
    setMessage('Checking if benchmark_comparisons table exists...');
    
    try {
      const response = await fetch('/api/admin/fix-benchmark-comparisons/check');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check table');
      }
      
      setDetails(data);
      setMessage(data.message);
      
      if (data.needsCreation) {
        setStatus('idle');
      } else {
        setStatus('success');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  const createTable = async () => {
    setStatus('creating');
    setMessage('Creating benchmark_comparisons table...');
    
    try {
      const response = await fetch('/api/admin/fix-benchmark-comparisons/create', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create table');
      }
      
      setStatus('success');
      setMessage('Successfully created benchmark_comparisons table!');
      setDetails(data);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
      setDetails(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Fix Benchmark Comparisons Table</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Missing Table</h2>
          <p className="text-gray-600 mb-6">
            This will create the benchmark_comparisons table that is required for tracking order delivery progress.
          </p>
          
          {status === 'idle' && !details && (
            <button
              onClick={checkTable}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Check Table Status
            </button>
          )}
          
          {status === 'idle' && details?.needsCreation && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Table Does Not Exist</h3>
                <p className="text-yellow-800">
                  The benchmark_comparisons table needs to be created to enable benchmark comparison functionality.
                </p>
              </div>
              <button
                onClick={createTable}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Create Table
              </button>
            </div>
          )}
          
          {status === 'checking' && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span>{message}</span>
            </div>
          )}
          
          {status === 'creating' && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              <span>{message}</span>
            </div>
          )}
          
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">{message}</p>
                  {details && (
                    <div className="mt-2 text-sm text-green-800">
                      <p>Table created with proper indexes and foreign keys.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Error: {message}</p>
                  {details && (
                    <pre className="mt-2 text-xs text-red-800 overflow-auto">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {details && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Details</h3>
            <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
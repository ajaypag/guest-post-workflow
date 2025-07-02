'use client';

import { useState } from 'react';

interface CheckResult {
  section: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: any;
}

export default function DatabaseCheckerPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runComprehensiveCheck = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const response = await fetch('/api/database-checker', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results);
      } else {
        setResults([{
          section: 'API Error',
          status: 'fail',
          message: data.error || 'Failed to run database check'
        }]);
      }
    } catch (error) {
      setResults([{
        section: 'Connection Error',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50';
      case 'fail': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Database State Checker
          </h1>
          <p className="text-gray-600 mb-6">
            This tool analyzes the entire workflow system to identify what's working vs what's broken:
            database structure, data persistence, workflow steps, API endpoints, and data flow.
          </p>
          
          <button
            onClick={runComprehensiveCheck}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Running Comprehensive Check...' : 'Run Full Database Analysis'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analysis Results</h2>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md border-l-4 ${
                    result.status === 'pass' ? 'border-green-500' :
                    result.status === 'fail' ? 'border-red-500' :
                    result.status === 'warning' ? 'border-yellow-500' :
                    'border-blue-500'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">{getStatusIcon(result.status)}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{result.section}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(result.status)}`}>
                          {result.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{result.message}</p>
                      
                      {result.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                            View Details
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.status === 'pass').length}
                  </div>
                  <div className="text-gray-600">Passing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => r.status === 'fail').length}
                  </div>
                  <div className="text-gray-600">Failing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.filter(r => r.status === 'warning').length}
                  </div>
                  <div className="text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.filter(r => r.status === 'info').length}
                  </div>
                  <div className="text-gray-600">Info</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
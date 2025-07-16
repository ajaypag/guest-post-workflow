'use client';

import { useState, useEffect } from 'react';

export default function ColumnCheckPage() {
  const [columnInfo, setColumnInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchColumnInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/check-column-sizes');
      if (!response.ok) throw new Error('Failed to fetch column info');
      const text = await response.text();
      setColumnInfo(text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumnInfo();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(columnInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Database Column Size Check</h1>
            <div className="flex gap-2">
              <button
                onClick={fetchColumnInfo}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={copyToClipboard}
                disabled={!columnInfo}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {copied ? '✓ Copied!' : 'Copy All'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-700">Error: {error}</span>
            </div>
          )}
          
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
              {loading ? 'Loading column information...' : columnInfo || 'No data available'}
            </pre>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Actions:</h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong>If polish_approach is varchar(100):</strong>
                <button
                  onClick={() => {
                    fetch('/api/admin/fix-polish-approach-column', { method: 'POST' })
                      .then(r => r.json())
                      .then(d => {
                        alert(JSON.stringify(d, null, 2));
                        if (d.success) fetchColumnInfo();
                      });
                  }}
                  className="ml-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  Fix Column Sizes
                </button>
              </div>
              <div>
                <strong>API Endpoint:</strong>
                <code className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">/api/admin/check-column-sizes</code>
              </div>
              <div>
                <strong>This page URL:</strong>
                <code className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">/admin/column-check</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { ArrowLeft, Bug, Play, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DebugAirtablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [searchDomain, setSearchDomain] = useState('');

  const runDebug = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/debug-airtable-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchDomain: searchDomain || null })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Debug failed:', error);
      setResults({ error: 'Debug failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Bug className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold">Debug Airtable Sync</h1>
          </div>
          
          <p className="text-gray-600">
            Debug Website Type and Niche data extraction from Airtable
          </p>
        </div>

        {/* Debug Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for specific website (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. example.com"
              value={searchDomain}
              onChange={(e) => setSearchDomain(e.target.value)}
              className="w-full max-w-md px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            onClick={runDebug}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading ? 'Debugging...' : 'Run Debug Test'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
            
            {results.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="text-red-800 font-medium">Error</div>
                <div className="text-red-600">{results.error}</div>
                {results.details && (
                  <div className="text-sm text-red-500 mt-2">{results.details}</div>
                )}
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.summary?.withCategories || 0}
                    </div>
                    <div className="text-sm text-blue-800">With Categories</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {results.summary?.withType || 0}
                    </div>
                    <div className="text-sm text-green-800">With Type (old)</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {results.summary?.withWebsiteType || 0}
                    </div>
                    <div className="text-sm text-purple-800">With Website Type</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {results.summary?.withNiche || 0}
                    </div>
                    <div className="text-sm text-orange-800">With Niche</div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="space-y-4">
                  <h3 className="font-medium">Website Details:</h3>
                  {results.debugInfo?.map((website: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="font-medium mb-2">{website.domain}</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Categories:</div> 
                          <div>{JSON.stringify(website.rawCategories)} ({website.categoriesLength})</div>
                          
                          <div className="text-gray-500 mt-2">Type (old):</div>
                          <div>{JSON.stringify(website.rawType)} ({website.typeLength})</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Website Type:</div>
                          <div>{JSON.stringify(website.rawWebsiteType)} ({website.websiteTypeLength})</div>
                          
                          <div className="text-gray-500 mt-2">Niche:</div>
                          <div>{JSON.stringify(website.rawNiche)} ({website.nicheLength})</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        {website.hasCategories && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Has Categories</span>}
                        {website.hasType && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Has Type</span>}
                        {website.hasWebsiteType && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Has Website Type</span>}
                        {website.hasNiche && <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">Has Niche</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Raw Airtable Data */}
                {results.rawAirtableData && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Raw Airtable API Response:</h3>
                    <div className="space-y-2">
                      {results.rawAirtableData.map((record: any, index: number) => (
                        <div key={index} className="border rounded p-3 text-sm">
                          <div className="font-medium">{record.domain}</div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            <div>
                              <span className="text-gray-500">Type Field:</span> {JSON.stringify(record.typeField)} 
                              <span className="ml-2 text-gray-400">({record.typeFieldType}, array: {record.isTypeArray ? 'yes' : 'no'})</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Niche Field:</span> {JSON.stringify(record.nicheField)}
                              <span className="ml-2 text-gray-400">({record.nicheFieldType}, array: {record.isNicheArray ? 'yes' : 'no'})</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <details className="mt-6">
                  <summary className="cursor-pointer font-medium text-gray-700">Full Raw JSON Response</summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
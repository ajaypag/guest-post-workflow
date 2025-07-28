'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

export default function CheckV2DataPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkV2Data = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/admin/check-v2-data');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check V2 data');
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Check V2 Qualification Data</h1>

          <button
            onClick={checkV2Data}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check V2 Data'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {results && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                <h2 className="font-semibold">Results</h2>
                <p>Total domains: {results.totalDomains}</p>
                <p>Domains with V2 data: {results.domainsWithV2Data}</p>
                <p>Domains with overlap_status: {results.withOverlapStatus}</p>
                <p>Domains with authority data: {results.withAuthorityData}</p>
                <p>Domains with topic_scope: {results.withTopicScope}</p>
              </div>

              {results.sampleDomains && results.sampleDomains.length > 0 && (
                <div className="p-4 bg-white border rounded-lg">
                  <h3 className="font-semibold mb-2">Sample domains with V2 data:</h3>
                  <div className="space-y-2">
                    {results.sampleDomains.map((domain: any, idx: number) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                        <p><strong>{domain.domain}</strong></p>
                        <p>Status: {domain.qualificationStatus}</p>
                        <p>Overlap: {domain.overlapStatus || 'null'}</p>
                        <p>Authority Direct: {domain.authorityDirect || 'null'}</p>
                        <p>Authority Related: {domain.authorityRelated || 'null'}</p>
                        <p>Topic Scope: {domain.topicScope || 'null'}</p>
                        <p>AI Qualified: {domain.aiQualifiedAt || 'Never'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.columnsExist !== undefined && (
                <div className={`p-4 ${results.columnsExist ? 'bg-green-50' : 'bg-red-50'} border rounded-lg`}>
                  <p className={results.columnsExist ? 'text-green-700' : 'text-red-700'}>
                    V2 columns {results.columnsExist ? 'exist' : 'do NOT exist'} in database
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}
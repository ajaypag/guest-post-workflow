'use client';

import { useState, useEffect } from 'react';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';

export default function TestV2DataPage() {
  const [domains, setDomains] = useState<BulkAnalysisDomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    try {
      // Get a client ID from the v2 data check
      const v2Response = await fetch('/api/admin/check-v2-data');
      const v2Data = await v2Response.json();
      
      console.log('V2 Data check:', v2Data);
      
      // If we have domains with V2 data, fetch them
      if (v2Data.withV2Data > 0 && v2Data.sampleDomains && v2Data.sampleDomains.length > 0) {
        const clientId = v2Data.sampleDomains[0].clientId;
        
        // Fetch domains using the same API the UI uses
        const response = await fetch(`/api/clients/${clientId}/bulk-analysis`);
        const data = await response.json();
        
        console.log('Full API response:', data);
        
        // Filter to show only domains with V2 data
        const domainsWithV2 = (data.domains || []).filter((d: any) => d.overlapStatus);
        setDomains(domainsWithV2);
      }
    } catch (error) {
      console.error('Error loading test data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">V2 Data Test Page</h1>
      
      <div className="space-y-4">
        {domains.length === 0 ? (
          <p>No domains with V2 data found</p>
        ) : (
          domains.map((domain) => (
            <div key={domain.id} className="border p-4 rounded-lg">
              <h2 className="font-bold">{domain.domain}</h2>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>Status: {domain.qualificationStatus}</div>
                <div>Overlap: {domain.overlapStatus || 'null'}</div>
                <div>Authority Direct: {domain.authorityDirect || 'null'}</div>
                <div>Authority Related: {domain.authorityRelated || 'null'}</div>
                <div>Topic Scope: {domain.topicScope || 'null'}</div>
                <div>Evidence: {JSON.stringify(domain.evidence) || 'null'}</div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold">Debug Info</h3>
        <pre className="mt-2 text-xs">
          {JSON.stringify({ domainCount: domains.length }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
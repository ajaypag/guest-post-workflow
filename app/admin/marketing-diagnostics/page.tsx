'use client';

import { useState, useEffect } from 'react';

export default function MarketingDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>({
    loading: true,
    database: null,
    websites: null,
    categories: null,
    api: null,
    environment: null,
    errors: []
  });

  useEffect(() => {
    async function runDiagnostics() {
      const results: any = {
        database: {},
        websites: {},
        categories: {},
        api: {},
        environment: {},
        errors: []
      };

      try {
        // 1. Check environment
        results.environment = {
          nodeEnv: process.env.NODE_ENV,
          hasDbUrl: !!process.env.DATABASE_URL,
          baseUrl: window.location.origin,
          timestamp: new Date().toISOString()
        };

        // 2. Test database connection
        const dbTestRes = await fetch('/api/admin/marketing-diagnostics/db-test');
        const dbTest = await dbTestRes.json();
        results.database = dbTest;

        // 3. Check websites table
        const websitesRes = await fetch('/api/admin/marketing-diagnostics/websites');
        const websitesData = await websitesRes.json();
        results.websites = websitesData;

        // 4. Check categories data
        const categoriesRes = await fetch('/api/admin/marketing-diagnostics/categories');
        const categoriesData = await categoriesRes.json();
        results.categories = categoriesData;

        // 5. Test public API endpoints
        const apiTests = {
          publicWebsites: await testApi('/api/public/websites?limit=5'),
          publicCategories: await testApi('/api/public/categories'),
          sampleCategory: await testApi('/api/public/websites?categories=Technology&limit=3')
        };
        results.api = apiTests;

      } catch (error) {
        results.errors.push({
          type: 'global',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }

      setDiagnostics({ ...results, loading: false });
    }

    async function testApi(url: string) {
      try {
        const start = Date.now();
        const res = await fetch(url);
        const duration = Date.now() - start;
        const data = await res.json();
        
        return {
          url,
          status: res.status,
          ok: res.ok,
          duration: `${duration}ms`,
          dataReceived: !!data,
          recordCount: data.websites?.length || data.categories?.length || 0,
          sample: data
        };
      } catch (error) {
        return {
          url,
          error: error instanceof Error ? error.message : 'Failed',
          status: 'error'
        };
      }
    }

    runDiagnostics();
  }, []);

  if (diagnostics.loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Marketing Site Diagnostics</h1>
        <p>Running comprehensive diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Marketing Site Diagnostics</h1>
      
      {/* Environment Info */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Environment</h2>
        <div className="space-y-2">
          <p><strong>Node Environment:</strong> {diagnostics.environment.nodeEnv}</p>
          <p><strong>Database URL Configured:</strong> {diagnostics.environment.hasDbUrl ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Base URL:</strong> {diagnostics.environment.baseUrl}</p>
          <p><strong>Timestamp:</strong> {diagnostics.environment.timestamp}</p>
        </div>
      </section>

      {/* Database Connection */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Database Connection</h2>
        {diagnostics.database.error ? (
          <div className="bg-red-50 p-4 rounded">
            <p className="text-red-800"><strong>Error:</strong> {diagnostics.database.error}</p>
            <pre className="text-xs mt-2">{diagnostics.database.details}</pre>
          </div>
        ) : (
          <div className="space-y-2">
            <p><strong>Status:</strong> {diagnostics.database.connected ? '✅ Connected' : '❌ Not Connected'}</p>
            <p><strong>Database Time:</strong> {diagnostics.database.currentTime}</p>
            <p><strong>Connection String:</strong> {diagnostics.database.connectionString || 'Not visible'}</p>
          </div>
        )}
      </section>

      {/* Websites Table */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Websites Table Analysis</h2>
        {diagnostics.websites.error ? (
          <div className="bg-red-50 p-4 rounded">
            <p className="text-red-800"><strong>Error:</strong> {diagnostics.websites.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Table Exists:</strong> {diagnostics.websites.exists ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Total Records:</strong> {diagnostics.websites.totalCount || 0}</p>
                <p><strong>Quality Records:</strong> {diagnostics.websites.qualityCount || 0}</p>
              </div>
              <div>
                <p><strong>With Categories:</strong> {diagnostics.websites.withCategories || 0}</p>
                <p><strong>With DR Data:</strong> {diagnostics.websites.withDomainRating || 0}</p>
                <p><strong>With Traffic:</strong> {diagnostics.websites.withTraffic || 0}</p>
              </div>
            </div>
            
            {diagnostics.websites.columns && (
              <div>
                <h3 className="font-semibold mt-4 mb-2">Table Columns:</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {diagnostics.websites.columns.map((col: any) => (
                    <div key={col.column_name} className="bg-gray-50 p-2 rounded">
                      <span className="font-mono">{col.column_name}</span>
                      <span className="text-gray-500 ml-2">({col.data_type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnostics.websites.sampleData && diagnostics.websites.sampleData.length > 0 && (
              <div>
                <h3 className="font-semibold mt-4 mb-2">Sample Websites:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">Domain</th>
                        <th className="px-4 py-2 text-left">DR</th>
                        <th className="px-4 py-2 text-left">Traffic</th>
                        <th className="px-4 py-2 text-left">Categories</th>
                        <th className="px-4 py-2 text-left">Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostics.websites.sampleData.map((site: any) => (
                        <tr key={site.id} className="border-t">
                          <td className="px-4 py-2">{site.domain}</td>
                          <td className="px-4 py-2">{site.domain_rating || '-'}</td>
                          <td className="px-4 py-2">{site.total_traffic || '-'}</td>
                          <td className="px-4 py-2">{site.categories?.join(', ') || '-'}</td>
                          <td className="px-4 py-2">{site.overall_quality || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Categories Analysis */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Categories Analysis</h2>
        {diagnostics.categories.error ? (
          <div className="bg-red-50 p-4 rounded">
            <p className="text-red-800"><strong>Error:</strong> {diagnostics.categories.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p><strong>Total Unique Categories:</strong> {diagnostics.categories.totalCategories || 0}</p>
            
            {diagnostics.categories.topCategories && (
              <div>
                <h3 className="font-semibold mb-2">Top Categories:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {diagnostics.categories.topCategories.map((cat: any) => (
                    <div key={cat.category} className="bg-gray-50 p-2 rounded flex justify-between">
                      <span>{cat.category}</span>
                      <span className="font-semibold">{cat.count} sites</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* API Endpoints Test */}
      <section className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Public API Endpoints</h2>
        <div className="space-y-4">
          {Object.entries(diagnostics.api).map(([key, test]: [string, any]) => (
            <div key={key} className="border rounded p-4">
              <h3 className="font-semibold mb-2">{key}</h3>
              <div className="space-y-1 text-sm">
                <p><strong>URL:</strong> <code>{test.url}</code></p>
                <p><strong>Status:</strong> {test.ok ? `✅ ${test.status}` : `❌ ${test.status || 'Failed'}`}</p>
                <p><strong>Response Time:</strong> {test.duration}</p>
                <p><strong>Records Returned:</strong> {test.recordCount}</p>
                {test.error && <p className="text-red-600"><strong>Error:</strong> {test.error}</p>}
                {test.sample && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600">View Response</summary>
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(test.sample, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Errors */}
      {diagnostics.errors.length > 0 && (
        <section className="mb-8 bg-red-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-800">Errors</h2>
          {diagnostics.errors.map((error: any, i: number) => (
            <div key={i} className="mb-4">
              <p className="font-semibold">{error.type}</p>
              <p>{error.message}</p>
              {error.stack && (
                <pre className="text-xs mt-2 overflow-x-auto">{error.stack}</pre>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
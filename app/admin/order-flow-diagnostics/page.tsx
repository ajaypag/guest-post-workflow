'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

function OrderFlowDiagnosticsContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  // Monitor console logs
  useEffect(() => {
    const logs: any[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      logs.push({ type: 'log', time: new Date().toISOString(), message: args });
    };
    console.error = (...args) => {
      originalError(...args);
      logs.push({ type: 'error', time: new Date().toISOString(), message: args });
    };
    console.warn = (...args) => {
      originalWarn(...args);
      logs.push({ type: 'warn', time: new Date().toISOString(), message: args });
    };

    // Store logs for display
    (window as any).__diagnosticLogs = logs;

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const runDiagnostics = async () => {
    if (!orderId) {
      alert('Please enter an order ID');
      return;
    }

    setLoading(true);
    setResults([]);
    const diagnostics: any[] = [];

    try {
      // 1. Check order basic data
      const orderRes = await fetch(`/api/admin/diagnostics/order/${orderId}`);
      const orderData = await orderRes.json();
      
      diagnostics.push({
        test: 'Order Basic Data',
        success: orderRes.ok,
        data: orderData,
        issues: []
      });

      if (orderRes.ok) {
        // 2. Check order groups structure
        const groups = orderData.orderGroups || [];
        diagnostics.push({
          test: 'Order Groups Analysis',
          success: groups.length > 0,
          data: {
            groupCount: groups.length,
            groups: groups.map((g: any) => ({
              id: g.id,
              clientId: g.clientId,
              clientName: g.client?.name,
              linkCount: g.linkCount,
              targetPagesCount: g.targetPages?.length || 0,
              targetPagesStructure: g.targetPages,
              targetPagesType: Array.isArray(g.targetPages) ? 'array' : typeof g.targetPages
            }))
          },
          issues: groups.filter((g: any) => !g.targetPages || g.targetPages.length === 0)
            .map((g: any) => `Group ${g.id} has no target pages`)
        });

        // 3. Analyze target pages in detail
        for (const group of groups) {
          const targetPageAnalysis = {
            test: `Target Pages for ${group.client?.name || group.clientId}`,
            success: false,
            data: {
              raw: group.targetPages,
              parsed: null as any,
              issues: [] as string[]
            }
          };

          if (group.targetPages) {
            // Check if it's a JSON string that needs parsing
            if (typeof group.targetPages === 'string') {
              try {
                targetPageAnalysis.data.parsed = JSON.parse(group.targetPages);
                targetPageAnalysis.data.issues.push('Target pages stored as string, needs parsing');
              } catch (e) {
                targetPageAnalysis.data.issues.push('Target pages string is not valid JSON');
              }
            } else if (Array.isArray(group.targetPages)) {
              // Check structure of each target page
              targetPageAnalysis.data.parsed = group.targetPages.map((tp: any, idx: number) => ({
                index: idx,
                hasUrl: !!tp.url,
                hasPageId: !!tp.pageId,
                structure: Object.keys(tp),
                raw: tp
              }));
              
              targetPageAnalysis.success = group.targetPages.every((tp: any) => 
                tp && (tp.url || tp.pageId)
              );
            }
          }

          diagnostics.push(targetPageAnalysis);
        }

        // 4. Check client target pages
        for (const group of groups) {
          if (group.clientId) {
            const clientRes = await fetch(`/api/admin/diagnostics/client/${group.clientId}/target-pages`);
            const clientData = await clientRes.json();
            
            diagnostics.push({
              test: `Client Target Pages for ${group.client?.name || group.clientId}`,
              success: clientRes.ok,
              data: {
                targetPagesCount: clientData.targetPages?.length || 0,
                targetPages: clientData.targetPages
              }
            });
          }
        }
      }

      // 5. Test the exact data flow
      diagnostics.push({
        test: 'Console Logs During Tests',
        data: (window as any).__diagnosticLogs || []
      });

    } catch (error: any) {
      diagnostics.push({
        test: 'Diagnostic Error',
        success: false,
        error: error.message
      });
    }

    setResults(diagnostics);
    setLoading(false);
  };

  const testOrderCreationFlow = async () => {
    setLoading(true);
    setTestResults([]);
    const tests: any[] = [];

    try {
      // Test 1: Create draft with target pages
      const testOrderData = {
        orderData: {
          accountEmail: 'test@example.com',
          accountName: 'Test Account',
          orderGroups: [{
            clientId: '4f48d013-bb1b-4271-884e-578e48e60459', // OutreachLabs
            linkCount: 2,
            targetPages: [
              { url: 'https://outreachlabs.com/blogger-outreach-service/', pageId: 'test-page-1' },
              { url: 'https://outreachlabs.com/guest-posting-service/', pageId: 'test-page-2' }
            ]
          }]
        }
      };

      console.log('Creating test order with data:', testOrderData);

      const createRes = await fetch('/api/orders/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrderData)
      });

      const createData = await createRes.json();
      
      tests.push({
        test: 'Draft Creation',
        success: createRes.ok,
        data: createData,
        sentData: testOrderData
      });

      if (createData.order?.id) {
        // Test 2: Fetch the created order
        const fetchRes = await fetch(`/api/admin/diagnostics/order/${createData.order.id}`);
        const fetchData = await fetchRes.json();
        
        tests.push({
          test: 'Fetch Created Order',
          success: fetchRes.ok,
          data: {
            orderGroups: fetchData.orderGroups,
            targetPagesFound: fetchData.orderGroups?.[0]?.targetPages
          }
        });

        // Test 3: Check how target pages are stored
        if (fetchData.orderGroups?.[0]) {
          const group = fetchData.orderGroups[0];
          tests.push({
            test: 'Target Pages Storage Analysis',
            data: {
              raw: group.targetPages,
              type: typeof group.targetPages,
              isArray: Array.isArray(group.targetPages),
              stringified: JSON.stringify(group.targetPages),
              parsed: typeof group.targetPages === 'string' ? 
                (() => { try { return JSON.parse(group.targetPages); } catch { return 'Parse error'; } })() : 
                group.targetPages
            }
          });
        }
      }

    } catch (error: any) {
      tests.push({
        test: 'Test Flow Error',
        success: false,
        error: error.message
      });
    }

    setTestResults(tests);
    setLoading(false);
  };

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="container mx-auto p-6">
        <Header />
        <h1 className="text-2xl font-bold mb-6">Order Flow Diagnostics</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Diagnose Existing Order</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter order ID (e.g., 21ee4386-60f3-4a03-9149-1aafe63f8ffa)"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Running...' : 'Run Diagnostics'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className={`p-4 rounded border ${
                  result.success === false ? 'border-red-300 bg-red-50' : 
                  result.success === true ? 'border-green-300 bg-green-50' : 
                  'border-gray-300 bg-gray-50'
                }`}>
                  <h3 className="font-semibold">{result.test}</h3>
                  {result.issues?.length > 0 && (
                    <div className="mt-2 text-red-600">
                      Issues: {result.issues.join(', ')}
                    </div>
                  )}
                  {result.data && (
                    <pre className="mt-2 text-xs overflow-auto max-h-64 bg-white p-2 rounded">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                  {result.error && (
                    <div className="mt-2 text-red-600">Error: {result.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Order Creation Flow</h2>
          <button
            onClick={testOrderCreationFlow}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Order Creation'}
          </button>

          {testResults.length > 0 && (
            <div className="space-y-4 mt-4">
              {testResults.map((result, idx) => (
                <div key={idx} className={`p-4 rounded border ${
                  result.success === false ? 'border-red-300 bg-red-50' : 
                  result.success === true ? 'border-green-300 bg-green-50' : 
                  'border-gray-300 bg-gray-50'
                }`}>
                  <h3 className="font-semibold">{result.test}</h3>
                  {result.sentData && (
                    <div className="mt-2">
                      <div className="font-medium">Sent Data:</div>
                      <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded">
                        {JSON.stringify(result.sentData, null, 2)}
                      </pre>
                    </div>
                  )}
                  {result.data && (
                    <div className="mt-2">
                      <div className="font-medium">Response Data:</div>
                      <pre className="text-xs overflow-auto max-h-64 bg-white p-2 rounded">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {result.error && (
                    <div className="mt-2 text-red-600">Error: {result.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}

export default function OrderFlowDiagnosticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderFlowDiagnosticsContent />
    </Suspense>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

export default function TestEditFlowPage() {
  const params = useParams();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runEditFlowTest = async () => {
    setLoading(true);
    const results: any[] = [];
    
    try {
      // 1. Fetch original order
      results.push({ step: 'Fetching original order...', status: 'running' });
      setTestResults([...results]);
      
      const originalResponse = await fetch(`/api/orders/${params.id}`, {
        credentials: 'include'
      });
      
      if (!originalResponse.ok) {
        results[results.length - 1].status = 'error';
        results[results.length - 1].error = `Failed to fetch order: ${originalResponse.status}`;
        setTestResults([...results]);
        return;
      }
      
      const originalOrder = await originalResponse.json();
      results[results.length - 1].status = 'success';
      results[results.length - 1].data = {
        subtotal: originalOrder.subtotal,
        totalPrice: originalOrder.totalPrice,
        groupCount: originalOrder.orderGroups?.length || 0,
        groups: originalOrder.orderGroups?.map((g: any) => ({
          client: g.client?.name,
          packageType: g.packageType,
          packagePrice: g.packagePrice
        }))
      };
      setTestResults([...results]);
      
      // 2. Prepare edit data
      results.push({ step: 'Preparing edit data...', status: 'running' });
      setTestResults([...results]);
      
      const editData = {
        // Use correct field names
        subtotal: 100000, // $1000.00
        totalPrice: 95000, // $950.00
        totalWholesale: 57000,
        profitMargin: 38000,
        discountPercent: '5',
        discountAmount: 5000,
        
        // Update order groups with new package info
        orderGroups: originalOrder.orderGroups?.map((group: any) => ({
          clientId: group.clientId,
          linkCount: group.linkCount,
          targetPages: group.targetPages || [],
          anchorTexts: group.anchorTexts || [],
          packageType: 'best', // Upgrade to best
          packagePrice: 59900, // $599.00
          groupStatus: group.groupStatus || 'pending'
        }))
      };
      
      results[results.length - 1].status = 'success';
      results[results.length - 1].data = {
        newSubtotal: editData.subtotal,
        newTotal: editData.totalPrice,
        packageUpgrade: 'All upgraded to BEST package'
      };
      setTestResults([...results]);
      
      // 3. Save the edit
      results.push({ step: 'Saving order edits...', status: 'running' });
      setTestResults([...results]);
      
      const saveResponse = await fetch(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
        credentials: 'include'
      });
      
      if (!saveResponse.ok) {
        results[results.length - 1].status = 'error';
        results[results.length - 1].error = `Failed to save: ${saveResponse.status}`;
        const errorText = await saveResponse.text();
        results[results.length - 1].details = errorText;
        setTestResults([...results]);
        return;
      }
      
      results[results.length - 1].status = 'success';
      setTestResults([...results]);
      
      // 4. Fetch updated order
      results.push({ step: 'Fetching updated order...', status: 'running' });
      setTestResults([...results]);
      
      const updatedResponse = await fetch(`/api/orders/${params.id}`, {
        credentials: 'include'
      });
      
      if (!updatedResponse.ok) {
        results[results.length - 1].status = 'error';
        results[results.length - 1].error = `Failed to fetch updated order: ${updatedResponse.status}`;
        setTestResults([...results]);
        return;
      }
      
      const updatedOrder = await updatedResponse.json();
      results[results.length - 1].status = 'success';
      results[results.length - 1].data = {
        subtotal: updatedOrder.subtotal,
        totalPrice: updatedOrder.totalPrice,
        groups: updatedOrder.orderGroups?.map((g: any) => ({
          client: g.client?.name,
          packageType: g.packageType,
          packagePrice: g.packagePrice
        }))
      };
      setTestResults([...results]);
      
      // 5. Verify changes
      results.push({ step: 'Verifying changes...', status: 'running' });
      setTestResults([...results]);
      
      const verification = {
        subtotalChanged: originalOrder.subtotal !== updatedOrder.subtotal,
        totalChanged: originalOrder.totalPrice !== updatedOrder.totalPrice,
        packagesUpgraded: updatedOrder.orderGroups?.every((g: any) => g.packageType === 'best'),
        pricesUpdated: updatedOrder.orderGroups?.every((g: any) => g.packagePrice === 59900)
      };
      
      results[results.length - 1].status = verification.subtotalChanged && verification.totalChanged && verification.packagesUpgraded && verification.pricesUpdated ? 'success' : 'warning';
      results[results.length - 1].data = verification;
      setTestResults([...results]);
      
    } catch (error) {
      results.push({ 
        step: 'Unexpected error', 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      setTestResults([...results]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Order Edit Flow Test</h1>
          <p className="text-gray-600 mb-6">Testing order ID: {params.id}</p>
          
          <div className="mb-6">
            <button
              onClick={runEditFlowTest}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Running Test...' : 'Run Edit Flow Test'}
            </button>
          </div>
          
          {testResults.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Test Results</h2>
              <div className="space-y-4">
                {testResults.map((result, idx) => (
                  <div key={idx} className="border-b pb-4 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${
                        result.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                        result.status === 'success' ? 'bg-green-500' :
                        result.status === 'warning' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`} />
                      <span className="font-medium">{result.step}</span>
                    </div>
                    {result.error && (
                      <div className="ml-6 text-sm text-red-600">{result.error}</div>
                    )}
                    {result.details && (
                      <div className="ml-6 text-xs text-gray-500 mt-1 font-mono">{result.details}</div>
                    )}
                    {result.data && (
                      <div className="ml-6 text-sm text-gray-600 mt-1">
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}